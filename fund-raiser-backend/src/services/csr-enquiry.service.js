const db = require('../config/db');

/**
 * CSR enquiries captured from the public CSR Collaboration page.
 *
 * Namespaced `csr-enquiry` throughout: `main` carries an unrelated Phase 2.2 CSR module
 * (csr_activities / corporate_profiles / csr_commitments) and these branches are kept apart.
 */

// ── Reference numbers ────────────────────────────────────────────────────────

/**
 * Next sequential reference for the given calendar year, e.g. ICE-CSR-2026-0001.
 *
 * Uses MySQL's LAST_INSERT_ID(expr) trick so the read-modify-write happens inside a
 * single atomic statement — two simultaneous submissions cannot be handed the same
 * number, which a `SELECT MAX(...) + 1` would allow.
 */
const nextCsrId = async (conn, year) => {
    await conn.query(
        `INSERT INTO csr_enquiry_counters (year, last_seq)
         VALUES (?, LAST_INSERT_ID(1))
         ON DUPLICATE KEY UPDATE last_seq = LAST_INSERT_ID(last_seq + 1)`,
        [year]
    );
    // db.getClient() wraps query() to return { rows, rowCount } — not mysql2's [rows, fields].
    const result = await conn.query('SELECT LAST_INSERT_ID() AS seq');
    const seq = Number(result.rows[0].seq);
    return `ICE-CSR-${year}-${String(seq).padStart(4, '0')}`;
};

// ── Anti-spam ────────────────────────────────────────────────────────────────

// Google reCAPTCHA v3, shared with the volunteer form. See services/utils/recaptcha.js.
const recaptcha = require('./utils/recaptcha');

// ── Validation ───────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
// Indian mobile/landline, with or without +91 and separators.
const PHONE_RE = /^(?:\+?91[\s-]?)?[0-9][0-9\s-]{7,14}$/;

const MAX_BUDGET = 10000000000; // ₹1,000 Cr — a typo guard, not a policy limit.

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * Field-level validation mirroring the inline errors the form shows. Returns a
 * { field: message } map so the frontend can attach each message to its own input.
 */
const validate = (body) => {
    const errors = {};

    const company = str(body.companyName);
    const contact = str(body.contactPerson);
    const designation = str(body.designation);
    const email = str(body.email).toLowerCase();
    const phone = str(body.phone);
    const area = str(body.areaOfInterest);
    const location = str(body.location);
    const message = str(body.message);

    if (company.length < 2) errors.companyName = 'Company name is required.';
    else if (company.length > 200) errors.companyName = 'Company name is too long.';

    if (contact.length < 2) errors.contactPerson = 'Contact person is required.';
    else if (contact.length > 150) errors.contactPerson = 'Contact person name is too long.';

    if (designation.length < 2) errors.designation = 'Designation is required.';
    else if (designation.length > 150) errors.designation = 'Designation is too long.';

    if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
    else if (email.length > 255) errors.email = 'Email address is too long.';

    const digits = phone.replace(/\D/g, '');
    if (!PHONE_RE.test(phone) || digits.length < 10 || digits.length > 12) {
        errors.phone = 'Enter a valid phone number (10 digits, optionally +91).';
    }

    const budget = Number(body.budget);
    if (!Number.isFinite(budget) || budget <= 0) errors.budget = 'Enter your CSR budget as a number.';
    else if (budget > MAX_BUDGET) errors.budget = 'That budget looks too large — please check.';

    if (!area) errors.areaOfInterest = 'Select an area of interest.';
    else if (area.length > 150) errors.areaOfInterest = 'Area of interest is too long.';

    if (!str(body.preferredProjectId)) errors.preferredProjectId = 'Select a preferred project.';

    if (location.length > 200) errors.location = 'Location is too long.';
    if (message.length > 2000) errors.message = 'Message is too long (2000 characters max).';

    return {
        errors,
        clean: {
            company_name: company,
            contact_person: contact,
            designation,
            email,
            phone,
            budget,
            area_of_interest: area,
            preferred_project_id: str(body.preferredProjectId) || null,
            location: location || null,
            message: message || null,
        },
    };
};

// ── Create ───────────────────────────────────────────────────────────────────

/**
 * Record an enquiry and mint its reference. Throws { status, message, errors } which
 * the controller turns into a 4xx; anything else bubbles to the error middleware.
 *
 * `meta.viaAdmin` marks an enquiry typed in by ICE staff from the admin panel. It comes
 * from the route the request arrived on — never from the request body — so a public
 * caller cannot label its own submission as staff-entered. Admin entry skips only the
 * honeypot, which makes sense against an anonymous visitor alone; the captcha is
 * required on both paths.
 */
const create = async (body, meta = {}) => {
    const viaAdmin = meta.viaAdmin === true;

    if (!viaAdmin) {
        // Honeypot: a real person never fills a field that is hidden from them.
        if (str(body.website)) {
            throw { status: 400, message: 'Submission rejected.' };
        }
    }

    // Verified on admin entry too: the panel's form shows the checkbox on both paths,
    // so a missing or replayed token is a genuine failure, not a staff exemption.
    const captcha = await recaptcha.verify(body.recaptchaToken, 'csr_enquiry', meta.ip);
    if (!captcha.ok) {
        throw { status: 400, message: recaptcha.failureMessage(captcha.reason) };
    }

    const { errors, clean } = validate(body);
    if (Object.keys(errors).length > 0) {
        throw { status: 422, message: 'Please correct the highlighted fields.', errors };
    }

    if (clean.preferred_project_id) {
        const project = await db.query(
            'SELECT id FROM projects WHERE id = ? AND is_active = true',
            [clean.preferred_project_id]
        );
        if (!project.rows.length) {
            throw {
                status: 422,
                message: 'Please correct the highlighted fields.',
                errors: { preferredProjectId: 'That project is no longer available.' },
            };
        }
    }

    const conn = await db.getClient();
    try {
        await conn.beginTransaction();

        const csrId = await nextCsrId(conn, new Date().getFullYear());

        await conn.query(
            `INSERT INTO csr_enquiries
                (csr_id, company_name, contact_person, designation, email, phone, budget,
                 area_of_interest, preferred_project_id, location, message, source_ip, user_agent,
                 submitted_via)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                csrId, clean.company_name, clean.contact_person, clean.designation,
                clean.email, clean.phone, clean.budget, clean.area_of_interest,
                clean.preferred_project_id, clean.location, clean.message,
                meta.ip || null, (meta.userAgent || '').slice(0, 255) || null,
                viaAdmin ? 'ice' : 'self',
            ]
        );

        await conn.commit();

        const created = await db.query(
            `SELECT e.*, p.name AS project_name
             FROM csr_enquiries e
             LEFT JOIN projects p ON p.id = e.preferred_project_id
             WHERE e.csr_id = ?`,
            [csrId]
        );
        return created.rows[0];
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

module.exports = {
    create,
    validate,
};
