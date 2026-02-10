const crypto = require('crypto');
const db = require('../config/db');

// Razorpay Webhook Handler
exports.razorpayWebhook = async (req, res, next) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        // Verify webhook signature
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(req.body)
            .digest('hex');

        if (expectedSignature !== signature) {
            console.log('Webhook signature verification failed');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const event = JSON.parse(req.body.toString());
        const { event: eventType, payload } = event;

        console.log(`Received webhook: ${eventType}`);

        switch (eventType) {
            case 'payment.captured':
                await handlePaymentCaptured(payload.payment.entity);
                break;
            case 'payment.failed':
                await handlePaymentFailed(payload.payment.entity);
                break;
            case 'refund.created':
                await handleRefundCreated(payload.refund.entity, payload.payment.entity);
                break;
            default:
                console.log(`Unhandled event type: ${eventType}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

// Handle successful payment
async function handlePaymentCaptured(payment) {
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // Update donation status
        const result = await client.query(
            `UPDATE donations 
             SET status = 'completed', razorpay_payment_id = $1, payment_method = $2
             WHERE razorpay_order_id = $3 AND status = 'pending'
             RETURNING id, amount, referrer_id, user_id`,
            [payment.id, payment.method, payment.order_id]
        );

        if (result.rows.length > 0) {
            const donation = result.rows[0];

            // Award referral points if not already awarded
            if (donation.referrer_id) {
                const checkPoints = await client.query(
                    'SELECT points_awarded FROM donations WHERE id = $1',
                    [donation.id]
                );

                if (!checkPoints.rows[0].points_awarded) {
                    const pointsToAward = Math.floor(parseFloat(donation.amount));

                    // Get donor name
                    const userResult = await client.query(
                        'SELECT name FROM users WHERE id = $1',
                        [donation.user_id]
                    );

                    await client.query(
                        'UPDATE users SET referral_points = referral_points + $1 WHERE id = $2',
                        [pointsToAward, donation.referrer_id]
                    );

                    await client.query(
                        `INSERT INTO referral_points_history (user_id, donation_id, points_earned, donor_name)
                         VALUES ($1, $2, $3, $4)`,
                        [donation.referrer_id, donation.id, pointsToAward, userResult.rows[0].name]
                    );

                    await client.query(
                        'UPDATE donations SET points_awarded = true WHERE id = $1',
                        [donation.id]
                    );
                }
            }
        }

        await client.query('COMMIT');
        console.log(`Payment captured for order: ${payment.order_id}`);

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Handle failed payment
async function handlePaymentFailed(payment) {
    await db.query(
        `UPDATE donations SET status = 'failed' WHERE razorpay_order_id = $1`,
        [payment.order_id]
    );
    console.log(`Payment failed for order: ${payment.order_id}`);
}

// Handle refund
async function handleRefundCreated(refund, payment) {
    await db.query(
        `UPDATE donations SET status = 'refunded' WHERE razorpay_payment_id = $1`,
        [payment.id]
    );
    console.log(`Refund created for payment: ${payment.id}`);
}
