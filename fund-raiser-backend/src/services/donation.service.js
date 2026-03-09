const Razorpay = require('razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const emailService = require('./email.service');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Tree-based grove pricing (entire quantity priced at one rate)
const TREE_GROVES = [
    { min: 1,  max: 5,        price: 2000 },
    { min: 6,  max: 10,       price: 1750 },
    { min: 11, max: 20,       price: 1500 },
    { min: 21, max: 50,       price: 1250 },
    { min: 51, max: Infinity,  price: 1000 },
];

const getTreePrice = (n) => TREE_GROVES.find(s => n >= s.min && n <= s.max)?.price;
const calculateTreeAmount = (n) => n * getTreePrice(n);

/**
 * Create Razorpay order
 */
const createOrder = async (userId, userName, numTrees, request80g = false, purpose = 'donation') => {
    let amount;
    let trees = null;

    if (purpose === 'registration_fee') {
        // Backward compat: numTrees is actually raw amount for registration fees
        amount = numTrees;
        if (!amount || amount < 1) {
            throw { status: 400, message: 'Please provide a valid amount (minimum ₹1)' };
        }
    } else {
        // Tree-based contribution
        if (!numTrees || numTrees < 1 || !Number.isInteger(numTrees)) {
            throw { status: 400, message: 'Please select at least 1 tree' };
        }
        const pricePerTree = getTreePrice(numTrees);
        if (!pricePerTree) {
            throw { status: 400, message: 'Invalid tree count' };
        }
        amount = calculateTreeAmount(numTrees);
        trees = numTrees;
    }

    const options = {
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
        notes: { userId, userName }
    };

    const order = await razorpay.orders.create(options);

    const donationId = uuidv4();
    const referrerResult = await db.query('SELECT referred_by FROM users WHERE id = ?', [userId]);
    const referrerId = referrerResult.rows[0]?.referred_by || null;
    await db.query(
        `INSERT INTO donations (id, user_id, amount, currency, num_trees, razorpay_order_id, status, referrer_id, request_80g, purpose)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [donationId, userId, amount, 'INR', trees, order.id, 'pending', referrerId, request80g, purpose]
    );

    return {
        orderId: order.id,
        donationId: donationId,
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
        const updateResult = await client.query(
            `UPDATE donations
             SET razorpay_payment_id = ?, razorpay_signature = ?, status = 'completed', payment_method = 'razorpay'
             WHERE razorpay_order_id = ? AND user_id = ?`,
            [razorpayPaymentId, razorpaySignature, razorpayOrderId, userId]
        );

        if (updateResult.rowCount === 0) {
            await client.query('ROLLBACK');
            throw { status: 404, message: 'Contribution not found' };
        }

        const donationResult = await client.query(
            'SELECT id, amount, num_trees, referrer_id, request_80g, purpose FROM donations WHERE razorpay_order_id = ? AND user_id = ?',
            [razorpayOrderId, userId]
        );
        const donation = donationResult.rows[0];

        // Award referral points
        if (donation.referrer_id) {
            const pointsToAward = Math.floor(parseFloat(donation.amount));
            await client.query(
                'UPDATE users SET referral_points = referral_points + ? WHERE id = ?',
                [pointsToAward, donation.referrer_id]
            );
            await client.query(
                `INSERT INTO referral_points_history (user_id, donation_id, points_earned, donor_name)
                 VALUES (?, ?, ?, ?)`,
                [donation.referrer_id, donation.id, pointsToAward, userName]
            );
            await client.query('UPDATE donations SET points_awarded = true WHERE id = ?', [donation.id]);
        }

        // Auto-create 80G certificate request if requested (skip duplicates)
        if (donation.request_80g) {
            const existingCert = await client.query(
                'SELECT id FROM certificate_requests WHERE donation_id = ?',
                [donation.id]
            );
            if (existingCert.rows.length === 0) {
                const userPan = await client.query(
                    'SELECT pan_number, name, email FROM users WHERE id = ?',
                    [userId]
                );
                const panNumber = userPan.rows[0]?.pan_number || 'PENDING';
                await client.query(
                    `INSERT INTO certificate_requests (user_id, donation_id, pan_number)
                     VALUES (?, ?, ?)`,
                    [userId, donation.id, panNumber]
                );

                // Send 80G request received notification to ICE team
                if (userPan.rows[0]) {
                    emailService.sendCertificateRequestReceivedEmail(
                        userPan.rows[0].name,
                        userPan.rows[0].email,
                        panNumber,
                        parseFloat(donation.amount),
                        new Date()
                    ).catch(err => console.error('Failed to send 80G request received email:', err.message));
                }
            }
        }

        await client.query('COMMIT');

        // Send confirmation email (non-blocking)
        const userResult = await db.query('SELECT email FROM users WHERE id = ?', [userId]);
        if (userResult.rows.length > 0) {
            emailService.sendDonationConfirmationEmail(
                userResult.rows[0].email,
                userName,
                parseFloat(donation.amount),
                razorpayPaymentId,
                new Date(),
                donation.num_trees
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
