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
const createOrder = async (userId, userName, amount, request80g = false, purpose = 'donation', projectId = null, csrReferenceNumber = null) => {
    if (!amount || amount < 1) {
        throw { status: 400, message: 'Please provide a valid amount (minimum ₹1)' };
    }

    // CSR-donation eligibility check: only orgs with a corporate_profile may use this purpose.
    // Silently downgrade to 'donation' otherwise — avoids accidental mis-tagging from a stale UI.
    let effectivePurpose = purpose;
    if (purpose === 'csr_donation') {
        const eligibility = await db.query(
            `SELECT u.user_type, cp.user_id AS corp_user_id
             FROM users u LEFT JOIN corporate_profiles cp ON cp.user_id = u.id
             WHERE u.id = ?`,
            [userId]
        );
        const row = eligibility.rows[0];
        if (!row || row.user_type !== 'organization' || !row.corp_user_id) {
            effectivePurpose = 'donation';
        }
    }

    const options = {
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
        notes: { userId, userName, purpose: effectivePurpose }
    };

    const order = await razorpay.orders.create(options);

    const donationId = uuidv4();
    const referrerResult = await db.query('SELECT referred_by FROM users WHERE id = ?', [userId]);
    const referrerId = referrerResult.rows[0]?.referred_by || null;
    const resolvedProjectId = await resolveProjectId(projectId);
    await db.query(
        `INSERT INTO donations (id, user_id, amount, currency, razorpay_order_id, status, referrer_id, request_80g, purpose, csr_reference_number, project_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [donationId, userId, amount, 'INR', order.id, 'pending', referrerId, request80g, effectivePurpose, csrReferenceNumber || null, resolvedProjectId]
    );

    return {
        orderId: order.id,
        donationId: donationId,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        purpose: effectivePurpose
    };
};

/**
 * Resume an existing pending/failed donation — re-open Razorpay checkout
 * against the SAME razorpay_order_id instead of creating a new order.
 * Razorpay allows multiple payment attempts on one order until it is paid.
 */
const resumeDonation = async (userId, donationId) => {
    if (!donationId) {
        throw { status: 400, message: 'donationId is required' };
    }
    const row = await db.query(
        `SELECT id, user_id, amount, currency, razorpay_order_id, status, request_80g, project_id, purpose, csr_reference_number
         FROM donations WHERE id = ? AND user_id = ?`,
        [donationId, userId]
    );
    if (row.rows.length === 0) {
        throw { status: 404, message: 'Donation not found' };
    }
    const d = row.rows[0];
    if (d.status === 'completed') {
        throw { status: 400, message: 'Donation is already paid' };
    }
    if (!d.razorpay_order_id) {
        throw { status: 400, message: 'No existing order to resume' };
    }
    return {
        orderId: d.razorpay_order_id,
        donationId: d.id,
        amount: Math.round(parseFloat(d.amount) * 100),
        currency: d.currency || 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        request80g: !!d.request_80g,
        projectId: d.project_id || null,
        purpose: d.purpose,
        csrReferenceNumber: d.csr_reference_number || null
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

        // Auto-create 80G certificate request if requested (skip duplicates)
        let createdCertId = null;
        if (donation.request_80g) {
            const existingCert = await client.query(
                'SELECT id FROM certificate_requests WHERE donation_id = ?',
                [donation.id]
            );
            if (existingCert.rows.length === 0) {
                const userPan = await client.query(
                    'SELECT pan_number FROM users WHERE id = ?',
                    [userId]
                );
                const panNumber = userPan.rows[0]?.pan_number || 'PENDING';
                createdCertId = uuidv4();
                await client.query(
                    `INSERT INTO certificate_requests (id, user_id, donation_id, type, pan_number, auto_generated)
                     VALUES (?, ?, ?, '80g', ?, true)`,
                    [createdCertId, userId, donation.id, panNumber]
                );
            } else {
                createdCertId = existingCert.rows[0].id;
            }
        }

        // Auto-create CSR receipt request for CSR donations (mutually exclusive with 80G — purpose decides)
        if (donation.purpose === 'csr_donation' && !createdCertId) {
            const existingReceipt = await client.query(
                'SELECT id FROM certificate_requests WHERE donation_id = ?',
                [donation.id]
            );
            if (existingReceipt.rows.length === 0) {
                const userPan = await client.query(
                    'SELECT pan_number FROM users WHERE id = ?',
                    [userId]
                );
                const panNumber = userPan.rows[0]?.pan_number || 'PENDING';
                createdCertId = uuidv4();
                await client.query(
                    `INSERT INTO certificate_requests (id, user_id, donation_id, type, pan_number, auto_generated)
                     VALUES (?, ?, ?, 'csr_receipt', ?, true)`,
                    [createdCertId, userId, donation.id, panNumber]
                );
            } else {
                createdCertId = existingReceipt.rows[0].id;
            }
        }

        await client.query('COMMIT');

        // Trigger PDF generation post-commit (best-effort; failure must not affect donation status).
        if (createdCertId) {
            certificateService.generate(createdCertId, { auto: true, silent: true })
                .catch(err => console.error('cert auto-gen failed:', err.message));
        }

        // Send confirmation email (non-blocking)
        const userResult = await db.query('SELECT email FROM users WHERE id = ?', [userId]);
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

module.exports = { createOrder, resumeDonation, verifyPayment };
