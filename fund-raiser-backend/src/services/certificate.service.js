const fs = require('fs');
const path = require('path');
const prisma = require('../config/prisma');
const settingsService = require('./settings.service');
const emailService = require('./email.service');
const { renderCertificate, renderCsrReceipt } = require('./pdf.template');
const db = require('../config/db');

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
const allocateCertificateNumber = async (fy, type = '80g') => {
    const seg = type === 'csr_receipt' ? 'CSR' : '80G';
    const prefix = `ICE/${seg}/${fy}/`;
    const last = await prisma.certificateRequest.findFirst({
        where: { certificate_number: { startsWith: prefix } },
        orderBy: { certificate_number: 'desc' },
        select: { certificate_number: true }
    });
    let nextSeq = 1;
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

const writePdf = (input, absPath, type = '80g') => new Promise((resolve, reject) => {
    ensureDir(path.dirname(absPath));
    const stream = fs.createWriteStream(absPath);
    stream.on('finish', resolve);
    stream.on('error', reject);
    try {
        if (type === 'csr_receipt') renderCsrReceipt(input, stream);
        else renderCertificate(input, stream);
    } catch (err) { stream.destroy(); reject(err); }
});

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
    const cert = await prisma.certificateRequest.findUnique({
        where: { id: certId },
        include: {
            user: true,
            donation: { include: { project: true } }
        }
    });
    if (!cert) {
        if (silent) return null;
        throw { status: 404, message: 'Certificate request not found' };
    }

    // Bump attempts up-front so admin sees activity even if assertRequired throws.
    await prisma.certificateRequest.update({
        where: { id: certId },
        data: { generation_attempts: { increment: 1 } }
    });

    try {
        await settingsService.assertRequired();
    } catch (err) {
        await prisma.certificateRequest.update({
            where: { id: certId },
            data: { last_generation_error: err.message || 'Org settings incomplete', status: 'pending' }
        });
        if (silent) return null;
        throw err;
    }

    if (!cert.donation) {
        const msg = 'Certificate request has no linked donation';
        await prisma.certificateRequest.update({
            where: { id: certId },
            data: { last_generation_error: msg, status: 'pending' }
        });
        if (silent) return null;
        throw { status: 400, message: msg };
    }

    // Prisma client may not yet expose the new `type` / `csr_reference_number` columns
    // (regen blocked while backend running on Windows). Read them via raw mysql2.
    const rawRow = await db.query(
        `SELECT cr.type AS cert_type, d.csr_reference_number
         FROM certificate_requests cr
         LEFT JOIN donations d ON d.id = cr.donation_id
         WHERE cr.id = ?`,
        [certId]
    );
    const certType = rawRow.rows[0]?.cert_type || '80g';
    const csrReferenceNumber = rawRow.rows[0]?.csr_reference_number || null;

    let certificateNumber = cert.certificate_number;
    if (!certificateNumber) {
        certificateNumber = await allocateCertificateNumber(indianFiscalYear(new Date()), certType);
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
        ice_logo: orgValue('ice_logo'),
        ice_csr1_reg_number: orgValue('ice_csr1_reg_number')
    };

    const donor = {
        name: cert.user.name,
        organization_name: cert.user.organization_name,
        address: buildDonorAddress(cert.user),
        email: cert.user.email,
        phone: cert.user.phone,
        pan: cert.pan_number
    };

    const donation = {
        amount: Number(cert.donation.amount),
        date: cert.donation.created_at,
        payment_id: cert.donation.razorpay_payment_id,
        project_name: cert.donation.project?.name || '',
        csr_reference_number: csrReferenceNumber
    };

    // CSR receipts pull from corporate_profiles for signatory + CIN/GSTIN/CSR-1 number
    let corporate = null;
    if (certType === 'csr_receipt') {
        const corpRow = await db.query(
            `SELECT cin, gstin, csr_registration_number, industry,
                    authorized_signatory_name, authorized_signatory_designation,
                    authorized_signatory_email, authorized_signatory_phone
             FROM corporate_profiles WHERE user_id = ?`,
            [cert.user_id]
        );
        corporate = corpRow.rows[0] || {};
    }

    const relPath = `/uploads/certificates/${cert.user_id}/${certId}.pdf`;
    const absPath = path.join(CERT_DIR_BASE, cert.user_id, `${certId}.pdf`);

    try {
        await writePdf({ org, donor, donation, corporate, certificateNumber, type: certType }, absPath, certType);
    } catch (err) {
        await prisma.certificateRequest.update({
            where: { id: certId },
            data: { last_generation_error: err.message || 'PDF render failed', status: 'pending' }
        });
        if (silent) return null;
        throw err;
    }

    const updated = await prisma.certificateRequest.update({
        where: { id: certId },
        data: {
            certificate_number: certificateNumber,
            pdf_url: relPath,
            status: 'approved',
            issued_at: new Date(),
            processed_at: new Date(),
            last_generation_error: null,
            auto_generated: cert.auto_generated || auto
        }
    });

    // Email is best-effort (logged, not awaited). CSR receipts go through
    // the CSR-flavored template; 80G certificates keep the existing copy.
    if (certType === 'csr_receipt') {
        const recipientName = cert.user.organization_name || cert.user.name;
        emailService.sendCsrReceiptGeneratedEmail?.(
            cert.user.email,
            recipientName,
            relPath,
            certificateNumber
        )?.catch?.(e => console.error('csr receipt email failed:', e.message));
    } else {
        emailService.sendCertificateGeneratedEmail?.(
            cert.user.email,
            cert.user.name,
            relPath,
            certificateNumber
        )?.catch?.(e => console.error('cert email failed:', e.message));
    }

    return updated;
};

const regenerate = async (certId) => generate(certId, { auto: false, silent: false });

const getDownloadFile = async (certId, requestingUser) => {
    const cert = await prisma.certificateRequest.findUnique({
        where: { id: certId },
        select: { id: true, user_id: true, pdf_url: true, status: true, certificate_number: true }
    });
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
