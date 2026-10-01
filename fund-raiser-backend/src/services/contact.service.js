// Google reCAPTCHA v2, shared with the CSR enquiry and volunteer forms.
const recaptcha = require('./utils/recaptcha');

/**
 * Messages from the "Break the ICE, say hi!" contact form on the ICE home page.
 *
 * Unlike CSR enquiries and volunteer registrations these are not stored: the form
 * replaced a WordPress one that only ever emailed its submissions, and it does the same.
 * This module checks the submission; contact-email.service.js delivers it.
 */

// ── Validation ───────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const PHONE_RE = /^(?:\+?91[\s-]?)?[0-9][0-9\s-]{7,14}$/;

/** What the visitor is getting in touch about — the options in the form's dropdown. */
const BRANCHES = ['Employment', 'Volunteer', 'Internship', 'Collaboration', 'Other'];
/** These are applications, so they must come with a CV. */
const BRANCHES_NEEDING_CV = ['Employment', 'Volunteer', 'Internship'];

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const digitsOf = (v) => str(v).replace(/\D/g, '');

/**
 * Field-level validation mirroring the form's inline errors. Returns a { field: message }
 * map so each message can be attached to its own input.
 */
const validate = (body, cv = null) => {
    const errors = {};

    const fullName = str(body.fullName);
    const phone = str(body.phone);
    const email = str(body.email).toLowerCase();
    const branch = str(body.branch);
    const message = str(body.message);

    if (fullName.length < 2) errors.fullName = 'Name is required.';
    else if (fullName.length > 150) errors.fullName = 'Name is too long.';

    const phoneDigits = digitsOf(phone);
    if (!PHONE_RE.test(phone) || phoneDigits.length < 10 || phoneDigits.length > 12) {
        errors.phone = 'Enter a valid phone number (10 digits, optionally +91).';
    }

    if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
    else if (email.length > 255) errors.email = 'Email address is too long.';

    if (!BRANCHES.includes(branch)) errors.branch = 'Please select a branch.';

    if (message.length > 2000) errors.message = 'Message is too long (2000 characters max).';

    if (BRANCHES_NEEDING_CV.includes(branch) && !cv) errors.cv = 'Please upload your CV (PDF, 2 MB maximum).';

    return {
        errors,
        clean: { full_name: fullName, phone, email, branch, message: message || null },
    };
};

// ── Submit ───────────────────────────────────────────────────────────────────

/**
 * Check a submission and hand back the cleaned message, ready to be emailed.
 * Throws { status, message, errors? } in the shape the form already handles.
 */
const prepare = async (body, files = {}, meta = {}) => {
    // Honeypot: a real person never fills a field that is hidden from them.
    if (str(body.website)) throw { status: 400, message: 'Submission rejected.' };

    const captcha = await recaptcha.verify(body.recaptchaToken, 'contact_message', meta.ip);
    if (!captcha.ok) {
        throw { status: 400, message: recaptcha.failureMessage(captcha.reason) };
    }

    const cv = files.cv?.[0] || null;
    const { errors, clean } = validate(body, cv);
    if (Object.keys(errors).length) {
        throw { status: 422, message: 'Please correct the highlighted fields.', errors };
    }

    return {
        ...clean,
        // Held in memory only — attached to the alert email, never written to disk.
        cv: cv ? { filename: cv.originalname, content: cv.buffer, contentType: cv.mimetype } : null,
        submitted_at: new Date(),
    };
};

module.exports = {
    prepare,
    validate,
    BRANCHES,
    BRANCHES_NEEDING_CV,
};
