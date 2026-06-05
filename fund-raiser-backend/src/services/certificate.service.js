const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const settingsService = require('./settings.service');
const emailService = require('./email.service');
const { renderCertificate } = require('./pdf.template');

const CERT_DIR_BASE = path.resolve(__dirname, '..', '..', 'uploads', 'certificates');

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const indianFiscalYear = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const startYear = d.getMonth() < 3 ? year - 1 : year; // months are 0-indexed; April = 3
    const endTwo = String(startYear + 1).slice(-2);
    return `${startYear}-${endTwo}`;
};

/**
 * Atomically allocate the next certificate number for the given FY.
 * Format: ICE/80G/<FY>/<seq> where seq is 4-digit zero-padded, FY-scoped.
 * Concurrency note: relies on the UNIQUE index on certificate_number — if two
 * concurrent generates pick the same seq, the second insert will fail and the
 * caller can retry. For Phase 2 volumes this is acceptable.
 */
const allocateCertificateNumber = async (fy) => {
    const prefix = `ICE/80G/${fy}/`;
    const result = await db.query(
        `SELECT certificate_number FROM certificate_requests
         WHERE certificate_number LIKE ?
         ORDER BY certificate_number DESC
         LIMIT 1`,
        [`${prefix}%`]
    );
    let nextSeq = 1;
    const last = result.rows[0];
    if (last?.certificate_number) {
        const tail = last.certificate_number.slice(prefix.length);
        const parsed = parseInt(tail, 10);
        if (Number.isFinite(parsed)) nextSeq = parsed + 1;
    }
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
};

const buildDonorAddress = (user) => {
    const parts = [
        user.address_line_1, user.address_line_2, user.area, user.city,
        user.state, user.pincode, user.country
    ].filter(Boolean);
    return parts.join(', ');
};

const writePdf = (input, absPath) => new Promise((resolve, reject) => {
    ensureDir(path.dirname(absPath));
    const stream = fs.createWriteStream(absPath);
    stream.on('finish', resolve);
    stream.on('error', reject);
    try { renderCertificate(input, stream); }
    catch (err) { stream.destroy(); reject(err); }
});

// Fetch a cert request with linked user, donation, and donation.project.
// Returns null if the cert doesn't exist.
const findCertWithRelations = async (certId) => {
    const certRes = await db.query(
        'SELECT * FROM certificate_requests WHERE id = ?',
        [certId]
    );
    const cert = certRes.rows[0];
    if (!cert) return null;

    const userRes = await db.query('SELECT * FROM users WHERE id = ?', [cert.user_id]);
    cert.user = userRes.rows[0] || null;

    if (cert.donation_id) {
        const donationRes = await db.query('SELECT * FROM donations WHERE id = ?', [cert.donation_id]);
        cert.donation = donationRes.rows[0] || null;
        if (cert.donation?.project_id) {
            const projectRes = await db.query('SELECT * FROM projects WHERE id = ?', [cert.donation.project_id]);
            cert.donation.project = projectRes.rows[0] || null;
        } else if (cert.donation) {
            cert.donation.project = null;
        }
    } else {
        cert.donation = null;
    }
    return cert;
};

const markCertError = (certId, message) =>
    db.query(
        `UPDATE certificate_requests
         SET last_generation_error = ?, status = 'pending'
         WHERE id = ?`,
        [message, certId]
    );

/**
 * Generate or regenerate the PDF for a cert request.
 * - assertRequired() runs first; missing org settings → row stays pending with error.
 * - PDF gen failure must NOT propagate to the donation flow. Callers in donation/webhook
 *   paths should ignore thrown errors (best-effort), but admin Regenerate surfaces them.
 *
 * @param {string} certId
 * @param {object} [opts]
 * @param {boolean} [opts.auto=false]   - true when fired by webhook/verify path
 * @param {boolean} [opts.silent=true]  - swallow errors (vs. throwing for admin Regenerate UX)
 */
const generate = async (certId, { auto = false, silent = true } = {}) => {
    const cert = await findCertWithRelations(certId);
    if (!cert) {
        if (silent) return null;
        throw { status: 404, message: 'Certificate request not found' };
    }

    // Bump attempts up-front so admin sees activity even if assertRequired throws.
    await db.query(
        'UPDATE certificate_requests SET generation_attempts = generation_attempts + 1 WHERE id = ?',
        [certId]
    );

    try {
        await settingsService.assertRequired();
    } catch (err) {
        await markCertError(certId, err.message || 'Org settings incomplete');
        if (silent) return null;
        throw err;
    }

    if (!cert.donation) {
        const msg = 'Certificate request has no linked donation';
        await markCertError(certId, msg);
        if (silent) return null;
        throw { status: 400, message: msg };
    }

    let certificateNumber = cert.certificate_number;
    if (!certificateNumber) {
        certificateNumber = await allocateCertificateNumber(indianFiscalYear(new Date()));
    }

    const settingsAll = await settingsService.getAll();
    const orgValue = (key) => settingsAll[key]?.setting_value || '';
    const org = {
        ice_legal_name: orgValue('ice_legal_name'),
        ice_registered_address: orgValue('ice_registered_address'),
        ice_pan: orgValue('ice_pan'),
        ice_80g_reg_number: orgValue('ice_80g_reg_number'),
        ice_80g_valid_from: orgValue('ice_80g_valid_from'),
        ice_80g_valid_to: orgValue('ice_80g_valid_to'),
        ice_signatory_name: orgValue('ice_signatory_name'),
        ice_signatory_image: orgValue('ice_signatory_image'),
        ice_logo: orgValue('ice_logo')
    };

    const donor = {
        name: cert.user.name,
        address: buildDonorAddress(cert.user),
        email: cert.user.email,
        phone: cert.user.phone,
        pan: cert.pan_number
    };

    const donation = {
        amount: Number(cert.donation.amount),
        date: cert.donation.created_at,
        payment_id: cert.donation.razorpay_payment_id,
        project_name: cert.donation.project?.name || ''
    };

    const relPath = `/uploads/certificates/${cert.user_id}/${certId}.pdf`;
    const absPath = path.join(CERT_DIR_BASE, cert.user_id, `${certId}.pdf`);

    try {
        await writePdf({ org, donor, donation, certificateNumber }, absPath);
    } catch (err) {
        await markCertError(certId, err.message || 'PDF render failed');
        if (silent) return null;
        throw err;
    }

    const now = new Date();
    const autoFlag = cert.auto_generated || auto;
    await db.query(
        `UPDATE certificate_requests
         SET certificate_number = ?,
             pdf_url = ?,
             status = 'approved',
             issued_at = ?,
             processed_at = ?,
             last_generation_error = NULL,
             auto_generated = ?
         WHERE id = ?`,
        [certificateNumber, relPath, now, now, autoFlag ? 1 : 0, certId]
    );

    const updatedRes = await db.query('SELECT * FROM certificate_requests WHERE id = ?', [certId]);
    const updated = updatedRes.rows[0];

    // Email is best-effort (logged, not awaited).
    emailService.sendCertificateGeneratedEmail?.(
        cert.user.email,
        cert.user.name,
        relPath,
        certificateNumber
    )?.catch?.(e => console.error('cert email failed:', e.message));

    return updated;
};

const regenerate = async (certId) => generate(certId, { auto: false, silent: false });

const getDownloadFile = async (certId, requestingUser) => {
    const certRes = await db.query(
        `SELECT id, user_id, pdf_url, status, certificate_number
         FROM certificate_requests
         WHERE id = ?`,
        [certId]
    );
    const cert = certRes.rows[0];
    if (!cert) throw { status: 404, message: 'Certificate not found' };

    const isOwner = cert.user_id === requestingUser?.id;
    const isAdmin = requestingUser?.isAdmin === true;
    if (!isOwner && !isAdmin) throw { status: 403, message: 'Forbidden' };

    if (!cert.pdf_url) throw { status: 404, message: 'Certificate PDF not yet generated' };

    const trimmed = cert.pdf_url.replace(/^\/+/, '');
    const abs = path.resolve(__dirname, '..', '..', trimmed);
    if (!fs.existsSync(abs)) throw { status: 404, message: 'Certificate file missing on disk' };

    return {
        absPath: abs,
        downloadName: `${cert.certificate_number || cert.id}.pdf`
    };
};

module.exports = { generate, regenerate, getDownloadFile, indianFiscalYear, allocateCertificateNumber };
