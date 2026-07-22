const Razorpay = require('razorpay');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
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
const createOrder = async (userId, userName, amount, request80g = false, purpose = 'donation', projectId = null, numTrees = null) => {
    if (!amount || amount < 1) {
        throw { status: 400, message: 'Please provide a valid amount (minimum ₹1)' };
    }
    // Number of trees this donation funds (tree-planting projects only). Coerce to a
    // positive integer or null so bad input never reaches the num_trees column.
    const treesFunded = Number.isFinite(Number(numTrees)) && Number(numTrees) > 0
        ? Math.floor(Number(numTrees))
        : null;

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
        `INSERT INTO donations (id, user_id, amount, currency, razorpay_order_id, status, referrer_id, request_80g, purpose, project_id, num_trees)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [donationId, userId, amount, 'INR', order.id, 'pending', referrerId, request80g, purpose, resolvedProjectId, treesFunded]
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

// ─── Offline donations (cheque / cash / bank transfer / manual UPI) ──────────
// Admin-only. Records a completed donation without going through Razorpay,
// auto-creates a donor account if none exists, awards referrer points on the
// same v2 formula, and (optionally) queues the 80G cert if PAN is on file.

const OFFLINE_METHODS = new Set(['cheque', 'cash', 'bank_transfer', 'upi_manual', 'demand_draft']);

const generateReferralCodeUnique = async (client) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    while (true) {
        let code = 'FR';
        for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
        const exists = await client.query('SELECT id FROM users WHERE referral_code = ?', [code]);
        if (exists.rows.length === 0) return code;
    }
};

/**
 * Find an existing donor by email or phone. Match by email first (case-insensitive,
 * unique in schema), then fall back to exact phone match. Returns row or null.
 */
const findDonorByContact = async (client, { email, phone }) => {
    if (email) {
        const byEmail = await client.query(
            'SELECT id, name, email, phone, pan_number, user_type FROM users WHERE email = ?',
            [String(email).toLowerCase()]
        );
        if (byEmail.rows.length) return byEmail.rows[0];
    }
    if (phone) {
        const byPhone = await client.query(
            'SELECT id, name, email, phone, pan_number, user_type FROM users WHERE phone = ?',
            [String(phone)]
        );
        if (byPhone.rows.length) return byPhone.rows[0];
    }
    return null;
};

/**
 * Create a stub donor account. Password is a random string the donor never sees —
 * they use the "forgot password" flow to claim the account if they log in.
 */
const createStubDonor = async (client, { name, email, phone, userType, organizationName, panNumber, city, referrerId }) => {
    const userId = uuidv4();
    const randomPassword = crypto.randomBytes(24).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 12);
    const referralCode = await generateReferralCodeUnique(client);
    await client.query(
        `INSERT INTO users (
            id, user_type, name, email, phone, password_hash,
            organization_name, pan_number, city, referral_code, referred_by,
            email_verified, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, false, true)`,
        [
            userId, userType || 'individual', name,
            String(email).toLowerCase(), String(phone), passwordHash,
            organizationName || null, panNumber || null, city || null,
            referralCode, referrerId || null
        ]
    );
    return { id: userId, name, email: String(email).toLowerCase(), phone: String(phone), pan_number: panNumber || null };
};

/**
 * Admin records an offline donation.
 *
 * Required: projectId (or defaults to ROOTS), amount, paymentMethod, paymentReference, donor.name + donor.email + donor.phone.
 * Optional: eventId, paymentReceivedAt, request80g, referralCode (donor's referrer), donor.userType/organizationName/panNumber/city.
 *
 * Behavior:
 *   1. Resolve donor: existing user by email → phone, else create stub.
 *   2. Insert donation with status='completed', payment_method, payment_reference,
 *      payment_received_at, recorded_by_admin_id. razorpay_* stays NULL.
 *   3. Award referrer points via v2 formula (₹100 = 1pt).
 *   4. If request_80g and donor has a valid PAN, create cert_request + fire generate() post-commit.
 *   5. Best-effort donation confirmation email to donor.
 */
const recordOfflineDonation = async (adminId, payload) => {
    const {
        projectId, eventId, amount, paymentMethod, paymentReference,
        paymentReceivedAt, request80g, donor, referralCode
    } = payload || {};

    if (!amount || Number(amount) < 1) throw { status: 400, message: 'Valid amount (min ₹1) is required' };
    if (!paymentMethod || !OFFLINE_METHODS.has(paymentMethod)) {
        throw { status: 400, message: `paymentMethod must be one of: ${[...OFFLINE_METHODS].join(', ')}` };
    }
    if (!paymentReference || !String(paymentReference).trim()) {
        throw { status: 400, message: 'paymentReference is required (cheque no / UTR / receipt no)' };
    }
    if (!donor || !donor.name || !donor.email || !donor.phone) {
        throw { status: 400, message: 'donor.name, donor.email, donor.phone are required' };
    }

    const resolvedProjectId = await resolveProjectId(projectId);
    if (!resolvedProjectId) throw { status: 500, message: 'ROOTS project fallback missing — cannot record donation' };

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // Idempotency: block a duplicate reference on the same project.
        const dup = await client.query(
            `SELECT id FROM donations
             WHERE project_id = ? AND payment_reference = ? AND status IN ('completed', 'pending')`,
            [resolvedProjectId, String(paymentReference).trim()]
        );
        if (dup.rows.length) {
            await client.query('ROLLBACK');
            throw { status: 409, message: 'A donation with this reference already exists on this project' };
        }

        // Resolve referrer (optional): admin passes the donor's referrer code.
        let referrerId = null;
        if (referralCode) {
            const refRow = await client.query(
                'SELECT id FROM users WHERE referral_code = ? AND is_active = true',
                [String(referralCode).toUpperCase()]
            );
            if (refRow.rows.length) referrerId = refRow.rows[0].id;
        }

        // Resolve or create donor.
        let donorRow = await findDonorByContact(client, { email: donor.email, phone: donor.phone });
        let donorCreated = false;
        if (!donorRow) {
            donorRow = await createStubDonor(client, {
                name: donor.name, email: donor.email, phone: donor.phone,
                userType: donor.userType, organizationName: donor.organizationName,
                panNumber: donor.panNumber, city: donor.city, referrerId
            });
            donorCreated = true;
        } else if (referrerId && !donorRow.referred_by) {
            // Attach referrer to existing donor only if they don't already have one.
            await client.query(
                'UPDATE users SET referred_by = ? WHERE id = ? AND referred_by IS NULL',
                [referrerId, donorRow.id]
            );
        }

        // Insert donation.
        const donationId = uuidv4();
        await client.query(
            `INSERT INTO donations (
                id, user_id, project_id, event_id, amount, currency,
                status, payment_method, payment_reference, payment_received_at,
                referrer_id, purpose, request_80g, recorded_by_admin_id
            ) VALUES (?, ?, ?, ?, ?, 'INR', 'completed', ?, ?, ?, ?, 'donation', ?, ?)`,
            [
                donationId, donorRow.id, resolvedProjectId, eventId || null,
                Number(amount), paymentMethod, String(paymentReference).trim(),
                paymentReceivedAt || null,
                referrerId, !!request80g, adminId
            ]
        );

        // Award referrer points (v2 formula) — same policy as online donations.
        if (referrerId) {
            const pointsToAward = computePoints(amount, 2);
            if (pointsToAward > 0) {
                await client.query(
                    'UPDATE users SET referral_points = referral_points + ? WHERE id = ?',
                    [pointsToAward, referrerId]
                );
                await client.query(
                    `INSERT INTO referral_points_history (user_id, donation_id, points_earned, donor_name)
                     VALUES (?, ?, ?, ?)`,
                    [referrerId, donationId, pointsToAward, donor.name]
                );
                await client.query('UPDATE donations SET points_awarded = true WHERE id = ?', [donationId]);
            }
        }

        // Queue 80G cert if requested and PAN available.
        let createdCertId = null;
        if (request80g) {
            const effectivePan = donor.panNumber || donorRow.pan_number;
            const panValid = effectivePan && /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(effectivePan);
            if (panValid) {
                createdCertId = uuidv4();
                await client.query(
                    `INSERT INTO certificate_requests (id, user_id, donation_id, pan_number, auto_generated)
                     VALUES (?, ?, ?, ?, true)`,
                    [createdCertId, donorRow.id, donationId, String(effectivePan).toUpperCase()]
                );
            } else {
                // Downgrade silently — donation still records; admin sees request_80g=false.
                await client.query('UPDATE donations SET request_80g = false WHERE id = ?', [donationId]);
            }
        }

        await client.query('COMMIT');

        // Post-commit best-effort side effects.
        if (createdCertId) {
            certificateService.generate(createdCertId, { auto: true, silent: true })
                .catch(err => console.error('[offline donation] cert auto-gen failed:', err.message));
        }

        emailService.sendDonationConfirmationEmail?.(
            donorRow.email, donor.name, Number(amount),
            `${paymentMethod.toUpperCase()}/${String(paymentReference).trim()}`,
            paymentReceivedAt ? new Date(paymentReceivedAt) : new Date()
        )?.then?.(info => console.log(`[offline donation email] sent to ${donorRow.email}, id=${info?.messageId || '?'}`))
         ?.catch?.(err => console.error(`[offline donation email] FAILED to ${donorRow.email}:`, err.message));

        return {
            donationId,
            donorId: donorRow.id,
            donorCreated,
            certificateRequestId: createdCertId,
            amount: Number(amount)
        };
    } catch (error) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Reverse a completed donation (e.g. cheque bounce).
 *
 * - Only completed donations can be reversed; already-reversed rows 409.
 * - status → 'reversed', reversed_at + reversal_reason set.
 * - If referrer points were awarded, subtract them from the referrer's balance
 *   and record a negative row in referral_points_history for audit.
 * - If an 80G cert was issued, mark it 'revoked' with revoked_at + revoked_reason.
 *   The PDF file is left on disk intentionally so audit trails can still reach it.
 */
const reverseDonation = async (adminId, donationId, reason) => {
    if (!donationId) throw { status: 400, message: 'donationId is required' };
    if (!reason || !String(reason).trim()) throw { status: 400, message: 'reversal reason is required' };

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const donationRes = await client.query(
            `SELECT id, user_id, amount, status, referrer_id, points_awarded, points_formula_version
             FROM donations WHERE id = ? FOR UPDATE`,
            [donationId]
        );
        if (donationRes.rows.length === 0) {
            await client.query('ROLLBACK');
            throw { status: 404, message: 'Donation not found' };
        }
        const donation = donationRes.rows[0];
        if (donation.status !== 'completed') {
            await client.query('ROLLBACK');
            throw { status: 409, message: `Cannot reverse donation with status '${donation.status}'` };
        }

        await client.query(
            `UPDATE donations
             SET status = 'reversed', reversed_at = NOW(), reversal_reason = ?
             WHERE id = ?`,
            [String(reason).trim(), donationId]
        );

        // Reverse referrer points if any were awarded.
        if (donation.points_awarded && donation.referrer_id) {
            const pointsToRevoke = computePoints(donation.amount, donation.points_formula_version);
            if (pointsToRevoke > 0) {
                await client.query(
                    'UPDATE users SET referral_points = GREATEST(referral_points - ?, 0) WHERE id = ?',
                    [pointsToRevoke, donation.referrer_id]
                );
                await client.query(
                    `INSERT INTO referral_points_history (user_id, donation_id, points_earned, donor_name)
                     VALUES (?, ?, ?, ?)`,
                    [donation.referrer_id, donationId, -pointsToRevoke, `[REVERSED] admin=${adminId}`]
                );
                await client.query('UPDATE donations SET points_awarded = false WHERE id = ?', [donationId]);
            }
        }

        // Revoke any linked 80G certificate.
        const certRes = await client.query(
            `SELECT id, status FROM certificate_requests WHERE donation_id = ?`,
            [donationId]
        );
        let revokedCertId = null;
        if (certRes.rows.length) {
            const cert = certRes.rows[0];
            if (cert.status !== 'revoked') {
                await client.query(
                    `UPDATE certificate_requests
                     SET status = 'revoked', revoked_at = NOW(), revoked_reason = ?
                     WHERE id = ?`,
                    [`Donation reversed: ${String(reason).trim()}`, cert.id]
                );
                revokedCertId = cert.id;
            }
        }

        await client.query('COMMIT');
        return { donationId, revokedCertificateId: revokedCertId };
    } catch (error) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        throw error;
    } finally {
        client.release();
    }
};

module.exports = { createOrder, verifyPayment, cancelPending, recordOfflineDonation, reverseDonation };
