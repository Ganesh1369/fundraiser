const db = require('../config/db');
const emailService = require('./email.service');

/**
 * Rendering and delivery for CSR enquiry emails.
 *
 * Bodies live in `csr_email_templates` and are admin-editable; the ICE shell around them
 * stays in email.service.js. Placeholders are {{camelCase}}.
 */

// In-process cache (60s TTL), matching settings.service. Templates change rarely and an
// admin save busts it immediately.
const CACHE_TTL_MS = 60 * 1000;
let cache = { data: null, ts: 0 };

const bustCache = () => {
    cache = { data: null, ts: 0 };
};

const getAll = async () => {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL_MS) return cache.data;

    const result = await db.query(
        `SELECT template_key, label, description, subject, eyebrow, greeting, message,
                show_reference, reference_caption, reference_value,
                show_detail_table, detail_fields,
                show_button, button_label, closing_note,
                placeholders, is_active, updated_at
         FROM csr_email_templates ORDER BY template_key ASC`
    );
    const indexed = Object.fromEntries(result.rows.map(r => [r.template_key, r]));
    cache = { data: indexed, ts: now };
    return indexed;
};

const EDITABLE_FIELDS = [
    'subject', 'eyebrow', 'greeting', 'message',
    'reference_caption', 'reference_value', 'detail_fields', 'button_label', 'closing_note',
];
const EDITABLE_FLAGS = ['show_reference', 'show_detail_table', 'show_button', 'is_active'];

/**
 * Save an admin's edits. Only the named fields are writable — there is no raw-HTML field
 * to save, so an edit cannot break the ICE layout.
 */
const updateOne = async (key, body, adminId) => {
    const all = await getAll();
    if (!(key in all)) throw { status: 404, message: `Unknown template: ${key}` };
    const current = all[key];

    const next = {};
    for (const f of EDITABLE_FIELDS) {
        next[f] = typeof body[f] === 'string' ? body[f].trim() : current[f];
    }
    for (const f of EDITABLE_FLAGS) {
        next[f] = typeof body[f] === 'boolean' ? body[f] : !!current[f];
    }

    if (!next.subject) throw { status: 400, message: 'Subject cannot be empty.' };
    if (next.subject.length > 255) throw { status: 400, message: 'Subject is too long (255 characters max).' };
    if (!next.message) throw { status: 400, message: 'Message cannot be empty.' };

    // Reject unknown keys so a stale UI cannot silently write a field that renders nothing.
    const unknown = (next.detail_fields || '').split(',').map(f => f.trim()).filter(f => f && !(f in DETAIL_LABELS));
    if (unknown.length) throw { status: 400, message: `Unknown detail fields: ${unknown.join(', ')}` };

    await db.query(
        `UPDATE csr_email_templates
         SET subject = ?, eyebrow = ?, greeting = ?, message = ?,
             show_reference = ?, reference_caption = ?, reference_value = ?,
             show_detail_table = ?, detail_fields = ?,
             show_button = ?, button_label = ?, closing_note = ?,
             is_active = ?, updated_by = ?
         WHERE template_key = ?`,
        [
            next.subject, next.eyebrow || null, next.greeting || null, next.message,
            next.show_reference, next.reference_caption || null, next.reference_value || null,
            next.show_detail_table, next.detail_fields || null,
            next.show_button, next.button_label || null, next.closing_note || null,
            next.is_active, adminId || null, key,
        ]
    );
    bustCache();
    return (await getAll())[key];
};

// ── Composition ──────────────────────────────────────────────────────────────

/**
 * Rows an admin can switch on in the detail table, and how each is labelled in the email.
 * The editor renders this list as checkboxes, so a key is never typed by hand.
 */
const DETAIL_LABELS = {
    companyName: 'Company',
    contactPerson: 'Contact',
    designation: 'Designation',
    email: 'Email',
    phone: 'Phone',
    budget: 'Budget',
    areaOfInterest: 'Area of interest',
    projectName: 'Preferred programme',
    location: 'Location',
    submittedAt: 'Submitted',
    message: 'Message',
    status: 'Status',
    statusReason: 'Reason',
    ownerName: 'Owner',
};

// ── Rendering ────────────────────────────────────────────────────────────────

const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Substitute {{placeholder}} tokens.
 *
 * Values are HTML-escaped — the enquirer's free-text message goes through here, so raw
 * markup in it must never reach a recipient's inbox as live HTML. An unknown placeholder
 * is left untouched rather than blanked, so a typo shows up in a test send.
 */
const render = (template, values) =>
    template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) =>
        (key in values && values[key] != null && values[key] !== '')
            ? escapeHtml(values[key])
            : (key in values ? '—' : match)
    );

const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const formatDateTime = (value) => new Date(value).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

/** Deep link an internal recipient straight to the enquiry's admin record. */
const adminLink = (enquiryId) => {
    const base = (process.env.FRONTEND_URL || 'http://localhost:4200').split(',')[0].trim();
    return `${base}/admin/csr-enquiries/${enquiryId}`;
};

/** The placeholder values available to every CSR enquiry template. */
const valuesFor = (enquiry, extra = {}) => ({
    csrId: enquiry.csr_id,
    companyName: enquiry.company_name,
    contactPerson: enquiry.contact_person,
    designation: enquiry.designation,
    email: enquiry.email,
    phone: enquiry.phone,
    budget: formatCurrency(enquiry.budget),
    areaOfInterest: enquiry.area_of_interest,
    projectName: enquiry.project_name || '',
    location: enquiry.location || '',
    message: enquiry.message || '',
    status: enquiry.status,
    statusReason: enquiry.status_reason || '',
    submittedAt: formatDateTime(enquiry.created_at),
    adminLink: adminLink(enquiry.id),
    ownerName: '',
    ...extra,
});

/**
 * Assemble the ICE-branded message body from an admin's structured fields.
 *
 * Every style lives here rather than in the database, so the layout stays consistent and
 * an admin edits wording and toggles only — there is no markup for them to get wrong.
 */
const compose = (tpl, values) => {
    const parts = [];
    const t = (v) => render(v || '', values);

    if (tpl.eyebrow) {
        parts.push(`<p style="color: #525252; margin: 0 0 16px; font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${t(tpl.eyebrow)}</p>`);
    }

    if (tpl.greeting) {
        parts.push(`<p style="color: #171717; font-size: 15px; margin: 0 0 4px;">${t(tpl.greeting)}</p>`);
    }

    // One paragraph per non-empty line, so an admin composes in plain text.
    (tpl.message || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .forEach(line => parts.push(
            `<p style="color: #525252; font-size: 14px; margin: 0 0 12px; line-height: 1.6;">${t(line)}</p>`
        ));

    if (tpl.show_reference && tpl.reference_value) {
        const caption = tpl.reference_caption
            ? `<p style="color: #737373; margin: 0 0 8px; font-size: 13px;">${t(tpl.reference_caption)}</p>`
            : '';
        parts.push(
            `<div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0;">
                ${caption}
                <h2 style="color: #16a34a; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 700;">${t(tpl.reference_value)}</h2>
            </div>`
        );
    }

    if (tpl.show_detail_table) {
        const keys = (tpl.detail_fields || '')
            .split(',')
            .map(k => k.trim())
            .filter(k => k && k in DETAIL_LABELS);

        if (keys.length) {
            const rows = keys.map(k => {
                const value = values[k];
                return `<tr>
                    <td style="padding: 6px 0; color: #737373; font-size: 13px; width: 42%;">${DETAIL_LABELS[k]}</td>
                    <td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">${escapeHtml(value == null || value === '' ? '—' : value)}</td>
                </tr>`;
            }).join('');
            parts.push(`<table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;">${rows}</table>`);
        }
    }

    if (tpl.show_button && tpl.button_label) {
        parts.push(
            `<div style="text-align:center; margin: 24px 0 8px;">
                <a href="${escapeHtml(values.adminLink)}" style="display:inline-block; background:#22c55e; color:#ffffff; padding:12px 28px; border-radius:10px; text-decoration:none; font-weight:600; font-size:14px;">${t(tpl.button_label)} &rarr;</a>
            </div>`
        );
    }

    if (tpl.closing_note) {
        parts.push(`<p style="color: #737373; font-size: 13px; margin: 16px 0 0; line-height: 1.6;">${t(tpl.closing_note)}</p>`);
    }

    return parts.join('\n');
};

/**
 * Render and send one template. Returns false (never throws) when the template is
 * inactive or missing — a failed notification must not roll back a saved enquiry.
 */
const sendTemplate = async (key, to, enquiry, extra = {}) => {
    if (!to) return false;
    const all = await getAll();
    const tpl = all[key];
    if (!tpl || !tpl.is_active) return false;

    const values = valuesFor(enquiry, extra);
    await emailService.sendWrappedEmail({
        to,
        subject: render(tpl.subject, values),
        bodyHtml: compose(tpl, values),
        replyTo: extra.replyTo,
    });
    return true;
};

// ── The four notifications ───────────────────────────────────────────────────

/** Internal inboxes. Comms falls back to Connect, which falls back to the SMTP sender. */
const internalRecipients = () => {
    const connect = process.env.CSR_CONNECT_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;
    const comms = process.env.CSR_COMMS_EMAIL || connect;
    return [...new Set([comms, connect].filter(Boolean))];
};

const sendAcknowledgement = (enquiry) =>
    sendTemplate('enquiry_acknowledgement', enquiry.email, enquiry);

const sendInternalAlert = (enquiry) => {
    const to = internalRecipients().join(', ');
    // Reply-to the enquirer so a team member can answer straight from the alert.
    return sendTemplate('internal_alert', to, enquiry, { replyTo: enquiry.email });
};

const sendAssignment = (enquiry, owner) =>
    sendTemplate('assignment', owner?.email, enquiry, { ownerName: owner?.name || owner?.username || 'there' });

/**
 * Status alert. Who receives it is per-stage configuration (`csr_status_alert_config`):
 * the owner, the internal inboxes, both, or — when a stage has both toggles off — nobody,
 * in which case the caller skips this entirely.
 */
const sendStatusChange = (enquiry, owner, opts = {}) => {
    const recipients = [];
    if (owner?.email) recipients.push(owner.email);
    if (opts.teamCopy) recipients.push(...internalRecipients());

    const to = [...new Set(recipients)].join(', ');
    if (!to) return false;

    return sendTemplate('status_change', to, enquiry, { ownerName: owner?.name || owner?.username || '' });
};

/**
 * Fire the new-enquiry notifications without blocking the HTTP response.
 *
 * The enquiry is already committed by this point: the submitter must get their reference
 * number even if SMTP is down, so delivery failures are logged, not surfaced.
 */
const notifyNewEnquiry = (enquiry) => {
    Promise.allSettled([
        sendAcknowledgement(enquiry),
        sendInternalAlert(enquiry),
    ]).then(([ack, alert]) => {
        // Log both outcomes: a silent success is indistinguishable from a process that
        // died mid-send, which makes "did it actually go?" unanswerable after the fact.
        const outcome = (label, r) => r.status === 'fulfilled'
            ? console.log(`CSR enquiry ${enquiry.csr_id}: ${label} ${r.value ? 'sent' : 'skipped (template inactive)'}`)
            : console.error(`CSR enquiry ${enquiry.csr_id}: ${label} FAILED —`, r.reason?.message || r.reason);
        outcome('acknowledgement', ack);
        outcome('internal alert', alert);
    });
};

module.exports = {
    DETAIL_LABELS,
    compose,
    getAll,
    updateOne,
    bustCache,
    render,
    sendAcknowledgement,
    sendInternalAlert,
    sendAssignment,
    sendStatusChange,
    notifyNewEnquiry,
    internalRecipients,
};
