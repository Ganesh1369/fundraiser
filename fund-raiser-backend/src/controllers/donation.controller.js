const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../config/db');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Razorpay order
exports.createOrder = async (req, res, next) => {
    try {
        const { amount } = req.body;

        if (!amount || amount < 1) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid amount (minimum ₹1)'
            });
        }

        // Create Razorpay order
        const options = {
            amount: Math.round(amount * 100), // Amount in paise
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`,
            notes: {
                userId: req.user.id,
                userName: req.user.name
            }
        };

        const order = await razorpay.orders.create(options);

        // Create pending donation record
        const result = await db.query(
            `INSERT INTO donations (user_id, amount, currency, razorpay_order_id, status, referrer_id)
             VALUES ($1, $2, $3, $4, $5, (SELECT referred_by FROM users WHERE id = $1))
             RETURNING id`,
            [req.user.id, amount, 'INR', order.id, 'pending']
        );

        res.json({
            success: true,
            data: {
                orderId: order.id,
                donationId: result.rows[0].id,
                amount: order.amount,
                currency: order.currency,
                keyId: process.env.RAZORPAY_KEY_ID
            }
        });

    } catch (error) {
        next(error);
    }
};

// Verify payment
exports.verifyPayment = async (req, res, next) => {
    const client = await db.getClient();

    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, donationId } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({
                success: false,
                message: 'Missing payment verification data'
            });
        }

        // Verify signature
        const sign = razorpayOrderId + '|' + razorpayPaymentId;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign)
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

        // Start transaction
        await client.query('BEGIN');

        // Update donation record
        const donationResult = await client.query(
            `UPDATE donations 
             SET razorpay_payment_id = $1, razorpay_signature = $2, status = 'completed', payment_method = 'razorpay'
             WHERE razorpay_order_id = $3 AND user_id = $4
             RETURNING id, amount, referrer_id`,
            [razorpayPaymentId, razorpaySignature, razorpayOrderId, req.user.id]
        );

        if (donationResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Donation not found'
            });
        }

        const donation = donationResult.rows[0];

        // Award referral points if there's a referrer
        if (donation.referrer_id) {
            const pointsToAward = Math.floor(parseFloat(donation.amount)); // 1 point per rupee

            // Update referrer's points
            await client.query(
                'UPDATE users SET referral_points = referral_points + $1 WHERE id = $2',
                [pointsToAward, donation.referrer_id]
            );

            // Record points history
            await client.query(
                `INSERT INTO referral_points_history (user_id, donation_id, points_earned, donor_name)
                 VALUES ($1, $2, $3, $4)`,
                [donation.referrer_id, donation.id, pointsToAward, req.user.name]
            );

            // Mark points as awarded
            await client.query(
                'UPDATE donations SET points_awarded = true WHERE id = $1',
                [donation.id]
            );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Payment verified successfully',
            data: {
                donationId: donation.id,
                amount: parseFloat(donation.amount)
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};
