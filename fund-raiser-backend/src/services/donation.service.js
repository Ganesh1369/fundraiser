const Razorpay = require('razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const emailService = require('./email.service');
const certificateService = require('./certificate.service');
const { computePoints } = require('./utils/referral-points');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * Resolve the project_id to attach to a new donation.
 * Falls back to ROOTS so every donation has a project (locked decision §14).
 */
const resolveProjectId = async (projectId) => {
    if (projectId) {
        const row = await db.query('SELECT id FROM projects WHERE id = ? AND is_active = true', [projectId]);
        if (row.rows.length > 0) return row.rows[0].id;
    }
    const roots = await db.query("SELECT id FROM projects WHERE slug = 'roots'");
    return roots.rows[0]?.id || null;
};

/**
 * Create Razorpay order
 */
const createOrder = async (userId, userName, amount, request80g = false, purpose = 'donation', projectId = null) => {
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

    const donationId = uuidv4();
    const referrerResult = await db.query('SELECT referred_by FROM users WHERE id = ?', [userId]);
    const referrerId = referrerResult.rows[0]?.referred_by || null;
    const resolvedProjectId = await resolveProjectId(projectId);
    await db.query(
        `INSERT INTO donations (id, user_id, amount, currency, razorpay_order_id, status, referrer_id, request_80g, purpose, project_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [donationId, userId, amount, 'INR', order.id, 'pending', referrerId, request80g, purpose, resolvedProjectId]
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
            throw { status: 404, message: 'Donation not found' };
        }

        const donationResult = await client.query(
            'SELECT id, amount, referrer_id, request_80g, purpose, points_formula_version FROM donations WHERE razorpay_order_id = ? AND user_id = ?',
            [razorpayOrderId, userId]
        );
        const donation = donationResult.rows[0];

        // Award referral points (skip for registration fees)
        if (donation.referrer_id && donation.purpose !== 'registration_fee') {
            const pointsToAward = computePoints(donation.amount, donation.points_formula_version);
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

        // Mark registration fee as paid
        if (donation.purpose === 'registration_fee') {
            await client.query('UPDATE users SET registration_fee_paid = true WHERE id = ?', [userId]);
        }

        // Auto-create 80G certificate request if requested (skip duplicates).
        // Hard gate on PAN: a cert is legally invalid without a real PAN, so if
        // the user has none on file we skip creation entirely and clear the
        // request_80g flag — the donation still completes. The user can request
        // the cert manually later via the dashboard once they've added a PAN.
        let createdCertId = null;
        if (donation.request_80g) {
            const userPan = await client.query(
                'SELECT pan_number FROM users WHERE id = ?',
                [userId]
            );
            const panNumber = userPan.rows[0]?.pan_number;
            const panValid = panNumber && /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(panNumber);

            if (!panValid) {
                await client.query(
                    'UPDATE donations SET request_80g = false WHERE id = ?',
                    [donation.id]
                );
            } else {
                const existingCert = await client.query(
                    'SELECT id FROM certificate_requests WHERE donation_id = ?',
                    [donation.id]
                );
                if (existingCert.rows.length === 0) {
                    createdCertId = uuidv4();
                    await client.query(
                        `INSERT INTO certificate_requests (id, user_id, donation_id, pan_number, auto_generated)
                         VALUES (?, ?, ?, ?, true)`,
                        [createdCertId, userId, donation.id, panNumber.toUpperCase()]
                    );
                } else {
                    createdCertId = existingCert.rows[0].id;
                }
            }
        }

        await client.query('COMMIT');

        // Trigger PDF generation post-commit (best-effort; failure must not affect donation status).
        if (createdCertId) {
            certificateService.generate(createdCertId, { auto: true, silent: true })
                .catch(err => console.error('cert auto-gen failed:', err.message));
        }

        // Send confirmation email (non-blocking). Log success + failure so we
        // can tell from the backend log whether SMTP actually accepted the message.
        const userResult = await db.query('SELECT email FROM users WHERE id = ?', [userId]);
        if (userResult.rows.length > 0) {
            const recipient = userResult.rows[0].email;
            console.log(`[donation email] attempting send to ${recipient} amount=${donation.amount}`);
            emailService.sendDonationConfirmationEmail(
                recipient,
                userName,
                parseFloat(donation.amount),
                razorpayPaymentId,
                new Date()
            )
                .then(info => console.log(`[donation email] sent to ${recipient}, messageId=${info?.messageId || '?'}`))
                .catch(err => console.error(`[donation email] FAILED to ${recipient}:`, err.message, err.code || ''));
        } else {
            console.warn(`[donation email] no user row found for userId=${userId}, skipping`);
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

/**
 * Discard a pending or failed donation row. Used when the user clicks Retry —
 * the old row is removed entirely so each donation series shows only its
 * latest attempt on the dashboard. Completed rows are protected (DELETE only
 * fires for status IN ('pending','failed')). Ownership is enforced by user_id.
 */
const cancelPending = async (userId, donationId) => {
    const result = await db.query(
        `DELETE FROM donations
         WHERE id = ? AND user_id = ? AND status IN ('pending', 'failed')`,
        [donationId, userId]
    );
    return { donationId, deleted: result.rowCount > 0 };
};

module.exports = { createOrder, verifyPayment, cancelPending };
