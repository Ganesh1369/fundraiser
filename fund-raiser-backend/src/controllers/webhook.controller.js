const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const emailService = require('../services/email.service');
const certificateService = require('../services/certificate.service');

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

    let donationForEmail = null;
    let userForEmail = null;
    let createdCertId = null;

    try {
        await client.query('BEGIN');

        // Update donation status
        const updateResult = await client.query(
            `UPDATE donations
             SET status = 'completed', razorpay_payment_id = ?, payment_method = ?
             WHERE razorpay_order_id = ? AND status = 'pending'`,
            [payment.id, payment.method, payment.order_id]
        );

        if (updateResult.rowCount > 0) {
            const donationResult = await client.query(
                'SELECT id, amount, referrer_id, user_id, purpose, request_80g FROM donations WHERE razorpay_order_id = ?',
                [payment.order_id]
            );
            const donation = donationResult.rows[0];

            // Mark registration fee as paid
            if (donation.purpose === 'registration_fee') {
                await client.query('UPDATE users SET registration_fee_paid = true WHERE id = ?', [donation.user_id]);
            }

            // Award referral points if not already awarded (skip for registration fees)
            if (donation.referrer_id && donation.purpose !== 'registration_fee') {
                const checkPoints = await client.query(
                    'SELECT points_awarded FROM donations WHERE id = ?',
                    [donation.id]
                );

                if (!checkPoints.rows[0].points_awarded) {
                    const pointsToAward = Math.floor(parseFloat(donation.amount));

                    // Get donor name
                    const userResult = await client.query(
                        'SELECT name FROM users WHERE id = ?',
                        [donation.user_id]
                    );

                    await client.query(
                        'UPDATE users SET referral_points = referral_points + ? WHERE id = ?',
                        [pointsToAward, donation.referrer_id]
                    );

                    await client.query(
                        `INSERT INTO referral_points_history (user_id, donation_id, points_earned, donor_name)
                         VALUES (?, ?, ?, ?)`,
                        [donation.referrer_id, donation.id, pointsToAward, userResult.rows[0].name]
                    );

                    await client.query(
                        'UPDATE donations SET points_awarded = true WHERE id = ?',
                        [donation.id]
                    );
                }
            }

            // Auto-create 80G cert request if requested (audit B4 fix — webhook used to skip this).
            if (donation.purpose === 'donation' && donation.request_80g) {
                const existingCert = await client.query(
                    'SELECT id FROM certificate_requests WHERE donation_id = ?',
                    [donation.id]
                );
                if (existingCert.rows.length === 0) {
                    const userPan = await client.query('SELECT pan_number FROM users WHERE id = ?', [donation.user_id]);
                    const panNumber = userPan.rows[0]?.pan_number || 'PENDING';
                    createdCertId = uuidv4();
                    await client.query(
                        `INSERT INTO certificate_requests (id, user_id, donation_id, pan_number, auto_generated)
                         VALUES (?, ?, ?, ?, true)`,
                        [createdCertId, donation.user_id, donation.id, panNumber]
                    );
                } else {
                    createdCertId = existingCert.rows[0].id;
                }
            }

            // Capture data for post-commit emails (avoid running them inside the txn).
            if (donation.purpose === 'donation') {
                const u = await client.query('SELECT email, name FROM users WHERE id = ?', [donation.user_id]);
                if (u.rows.length > 0) {
                    donationForEmail = donation;
                    userForEmail = u.rows[0];
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

    // ===== Post-commit, best-effort side-effects (audit B4 fix). =====
    if (donationForEmail && userForEmail) {
        emailService.sendDonationConfirmationEmail(
            userForEmail.email, userForEmail.name,
            parseFloat(donationForEmail.amount), payment.id, new Date()
        ).catch(err => console.error('webhook donation email failed:', err.message));
    }
    if (createdCertId) {
        certificateService.generate(createdCertId, { auto: true, silent: true })
            .catch(err => console.error('webhook cert auto-gen failed:', err.message));
    }
}

// Handle failed payment
async function handlePaymentFailed(payment) {
    await db.query(
        `UPDATE donations SET status = 'failed' WHERE razorpay_order_id = ?`,
        [payment.order_id]
    );
    console.log(`Payment failed for order: ${payment.order_id}`);
}

// Handle refund
async function handleRefundCreated(refund, payment) {
    await db.query(
        `UPDATE donations SET status = 'refunded' WHERE razorpay_payment_id = ?`,
        [payment.id]
    );
    console.log(`Refund created for payment: ${payment.id}`);
}
