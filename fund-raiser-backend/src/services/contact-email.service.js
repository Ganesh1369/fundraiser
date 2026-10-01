const emailService = require('./email.service');

/**
 * Rendering and delivery for the home-page contact form.
 *
 * Mirrors volunteer-email.service.js: an alert to the internal inbox and an
 * acknowledgement to the sender, both wrapped in the ICE shell from email.service.js.
 * The alert is the only record of the message — nothing is stored — so the caller waits
 * for it and reports a failure to the visitor instead of losing their message silently.
 */

// ── Rendering ────────────────────────────────────────────────────────────────

const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDateTime = (value) => new Date(value).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const paragraph = (text) =>
    `<p style="color: #525252; font-size: 14px; margin: 0 0 12px; line-height: 1.6;">${text}</p>`;

const greeting = (text) =>
    `<p style="color: #171717; font-size: 15px; margin: 0 0 4px;">${text}</p>`;

const eyebrow = (text) =>
    `<p style="color: #525252; margin: 0 0 16px; font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${text}</p>`;

/** Detail table. Empty values render as an em dash rather than a blank cell. */
const detailTable = (rows) => {
    const cells = rows.map(([label, value]) => `<tr>
        <td style="padding: 6px 0; color: #737373; font-size: 13px; width: 42%; vertical-align: top;">${escapeHtml(label)}</td>
        <td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600; white-space: pre-wrap;">${escapeHtml(value == null || value === '' ? '—' : value)}</td>
    </tr>`).join('');
    return `<table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;">${cells}</table>`;
};

const closingNote = (text) =>
    `<p style="color: #737373; font-size: 13px; margin: 16px 0 0; line-height: 1.6;">${text}</p>`;

// ── The two notifications ────────────────────────────────────────────────────

/**
 * Internal inbox. Falls back through the CSR address to the SMTP sender, so a message
 * always has somewhere to land even before CONTACT_ALERT_EMAIL is set.
 */
const internalRecipients = () => {
    const inbox = process.env.CONTACT_ALERT_EMAIL
        || process.env.CSR_CONNECT_EMAIL
        || process.env.SMTP_FROM
        || process.env.SMTP_USER;
    return [...new Set([inbox].filter(Boolean))];
};

/** The message itself, to the internal inbox, with the CV attached when there is one. */
const sendInternalAlert = async (msg) => {
    const to = internalRecipients().join(', ');
    if (!to) throw new Error('No inbox is configured for contact messages.');

    const bodyHtml = [
        eyebrow('New message from the website'),
        paragraph(`<strong>${escapeHtml(msg.full_name)}</strong> got in touch through the contact form.`),
        detailTable([
            ['Name', msg.full_name],
            ['Phone', msg.phone],
            ['Email', msg.email],
            ['Branch', msg.branch],
            ['Area of interest', msg.message],
            ['CV', msg.cv ? `Attached (${msg.cv.filename})` : 'Not provided'],
            ['Submitted', formatDateTime(msg.submitted_at)],
        ]),
        closingNote('Reply to this email to answer the sender directly.'),
    ].join('\n');

    await emailService.sendWrappedEmail({
        to,
        subject: `Website contact: ${msg.branch} — ${msg.full_name}`,
        bodyHtml,
        // Reply-to the sender so a team member can answer straight from the alert.
        replyTo: msg.email,
        attachments: msg.cv ? [msg.cv] : [],
    });
    return true;
};

/** A short receipt for the sender. */
const sendAcknowledgement = async (msg) => {
    const about = msg.branch === 'Other' ? '' : ` about ${escapeHtml(msg.branch.toLowerCase())}`;
    const bodyHtml = [
        eyebrow('We have your message'),
        greeting(`Hello ${escapeHtml(msg.full_name)},`),
        paragraph(`Thank you for getting in touch with the Institute for Climate and Environment (ICE)${about}. We're glad you want to be part of our mission to build a more sustainable, conscious and climate-resilient world.`),
        paragraph('Your message has been received and our team will review it shortly. You can expect to hear from us within the next few days.'),
        closingNote('If you need to add anything, reply to this email.'),
    ].join('\n');

    await emailService.sendWrappedEmail({
        to: msg.email,
        subject: 'Thank you for contacting ICE',
        bodyHtml,
    });
    return true;
};

/**
 * Deliver a contact message. Waits for the internal alert — it is the only copy — and
 * lets a failure there reach the caller. The acknowledgement is a courtesy: it is sent
 * without blocking, and a failure is only logged.
 */
const deliver = async (msg) => {
    await sendInternalAlert(msg);
    console.log(`Contact message from ${msg.email} (${msg.branch}): internal alert sent`);

    sendAcknowledgement(msg)
        .then(() => console.log(`Contact message from ${msg.email}: acknowledgement sent`))
        .catch((err) => console.error(`Contact message from ${msg.email}: acknowledgement FAILED —`, err?.message || err));
};

module.exports = {
    deliver,
    sendInternalAlert,
    sendAcknowledgement,
    internalRecipients,
};
