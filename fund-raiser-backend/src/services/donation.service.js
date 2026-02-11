const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../config/db');
const emailService = require('./email.service');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * Create Razorpay order
 */
const createOrder = async (userId, userName, amount, request80g = false) => {
    if (!amount || amount < 1) {
        throw { status: 400, message: 'Please provide a valid amount (minimum ₹1)' };
    }

    const options = {
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
        notes: { userId, userName }
    };

    const order = await razorpay.orders.create(options);

    const result = await db.query(
        `INSERT INTO donations (user_id, amount, currency, razorpay_order_id, status, referrer_id, request_80g)
         VALUES ($1, $2, $3, $4, $5, (SELECT referred_by FROM users WHERE id = $1), $6)
         RETURNING id`,
        [userId, amount, 'INR', order.id, 'pending', request80g]
    );

    return {
        orderId: order.id,
        donationId: result.rows[0].id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID
    };
};

/**
 * Verify payment and send confirmation email
 */
const verifyPayment = async (userId, userName, razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        throw { status: 400, message: 'Missing payment verification data' };
    }

    // Verify signature
    const sign = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(sign)
        .digest('hex');

    if (expectedSignature !== razorpaySignature) {
        throw { status: 400, message: 'Payment verification failed' };
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // Update donation record
        const donationResult = await client.query(
            `UPDATE donations 
             SET razorpay_payment_id = $1, razorpay_signature = $2, status = 'completed', payment_method = 'razorpay'
             WHERE razorpay_order_id = $3 AND user_id = $4
             RETURNING id, amount, referrer_id, request_80g`,
            [razorpayPaymentId, razorpaySignature, razorpayOrderId, userId]
        );

        if (donationResult.rows.length === 0) {
            await client.query('ROLLBACK');
            throw { status: 404, message: 'Donation not found' };
        }

        const donation = donationResult.rows[0];

        // Award referral points
        if (donation.referrer_id) {
            const pointsToAward = Math.floor(parseFloat(donation.amount));
            await client.query(
                'UPDATE users SET referral_points = referral_points + $1 WHERE id = $2',
                [pointsToAward, donation.referrer_id]
            );
            await client.query(
                `INSERT INTO referral_points_history (user_id, donation_id, points_earned, donor_name)
                 VALUES ($1, $2, $3, $4)`,
                [donation.referrer_id, donation.id, pointsToAward, userName]
            );
            await client.query('UPDATE donations SET points_awarded = true WHERE id = $1', [donation.id]);
        }

        // Auto-create 80G certificate request if requested
        if (donation.request_80g) {
            const userPan = await client.query(
                'SELECT pan_number FROM users WHERE id = $1',
                [userId]
            );
            const panNumber = userPan.rows[0]?.pan_number || 'PENDING';
            await client.query(
                `INSERT INTO certificate_requests (user_id, donation_id, pan_number)
                 VALUES ($1, $2, $3)`,
                [userId, donation.id, panNumber]
            );
        }

        await client.query('COMMIT');

        // Send confirmation email (non-blocking)
        const userResult = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length > 0) {
            emailService.sendDonationConfirmationEmail(
                userResult.rows[0].email,
                userName,
                parseFloat(donation.amount),
                razorpayPaymentId,
                new Date()
            ).catch(err => console.error('Failed to send donation email:', err.message));
        }

        return {
            donationId: donation.id,
            amount: parseFloat(donation.amount)
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = { createOrder, verifyPayment };
