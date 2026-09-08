const emailService = require('./email.service');

/**
 * Rendering and delivery for volunteer registration emails.
 *
 * Mirrors csr-enquiry-email.service.js: an acknowledgement to the volunteer and an alert
 * to the internal inboxes, both wrapped in the ICE shell from email.service.js. The copy
 * is defined here rather than in a database table — the CSR templates are admin-editable
 * because staff rewrite them per campaign; a registration receipt says the same thing
 * every time.
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

const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
});

const OCCUPATION_LABELS = { student: 'Student', working: 'Working professional', other: 'Other' };

/** "Weekdays and weekends", or whichever single one was ticked. */
const availability = (volunteer) => {
    const days = [];
    if (volunteer.available_weekday) days.push('Weekdays');
    if (volunteer.available_weekend) days.push('Weekends');
    const when = days.join(' and ') || '—';
    return volunteer.hours_per_week ? `${when} · ~${volunteer.hours_per_week} hrs/week` : when;
};

/** Deep link an internal recipient straight to the volunteer's admin record. */
const adminLink = (volunteerRowId) => {
    const base = (process.env.FRONTEND_URL || 'http://localhost:4200').split(',')[0].trim();
    return `${base}/admin/volunteers/${volunteerRowId}`;
};

/**
 * Rows in the detail table, and how each is labelled. Ordered as the form asks for them,
 * so an alert reads in the same order as the record it points at.
 */
const detailRows = (volunteer) => [
    ['Volunteer ID', volunteer.volunteer_id],
    ['Name', volunteer.full_name],
    ['Date of birth', volunteer.date_of_birth ? formatDate(volunteer.date_of_birth) : ''],
    ['Email', volunteer.email],
    ['Phone', volunteer.phone],
    ['City', volunteer.city],
    ['Pincode', volunteer.pincode],
    ['Occupation', OCCUPATION_LABELS[volunteer.occupation_type] || volunteer.occupation_type],
    ['Institution', volunteer.institution],
    ['College', volunteer.college_name],
    ['Course', volunteer.course],
    ['Availability', availability(volunteer)],
    ['Area of interest', volunteer.area_of_interest],
    ['Role of interest', volunteer.role_of_interest],
    ['Languages', volunteer.languages],
    ['Emergency contact', volunteer.emergency_name
        ? `${volunteer.emergency_name} (${volunteer.emergency_relationship}) · ${volunteer.emergency_phone}`
        : ''],
    ['Photo consent', volunteer.consent_photo_media ? 'Given' : 'Not given'],
    ['Registered via', volunteer.submitted_via === 'ice' ? 'Staff entry' : 'Website'],
    ['Submitted', volunteer.created_at ? formatDateTime(volunteer.created_at) : ''],
    ['Message', volunteer.message],
];

const paragraph = (text) =>
    `<p style="color: #525252; font-size: 14px; margin: 0 0 12px; line-height: 1.6;">${text}</p>`;

const greeting = (text) =>
    `<p style="color: #171717; font-size: 15px; margin: 0 0 4px;">${text}</p>`;

const eyebrow = (text) =>
    `<p style="color: #525252; margin: 0 0 16px; font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${text}</p>`;

/** The green reference block the CSR acknowledgement uses for its enquiry number. */
const referenceBlock = (caption, value) =>
    `<div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0;">
        <p style="color: #737373; margin: 0 0 8px; font-size: 13px;">${escapeHtml(caption)}</p>
        <h2 style="color: #16a34a; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 700;">${escapeHtml(value)}</h2>
    </div>`;

/** Detail table. Empty values render as an em dash rather than a blank cell. */
const detailTable = (rows) => {
    const cells = rows.map(([label, value]) => `<tr>
        <td style="padding: 6px 0; color: #737373; font-size: 13px; width: 42%;">${escapeHtml(label)}</td>
        <td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">${escapeHtml(value == null || value === '' ? '—' : value)}</td>
    </tr>`).join('');
    return `<table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;">${cells}</table>`;
};

const button = (label, href) =>
    `<div style="text-align:center; margin: 24px 0 8px;">
        <a href="${escapeHtml(href)}" style="display:inline-block; background:#22c55e; color:#ffffff; padding:12px 28px; border-radius:10px; text-decoration:none; font-weight:600; font-size:14px;">${escapeHtml(label)} &rarr;</a>
    </div>`;

const closingNote = (text) =>
    `<p style="color: #737373; font-size: 13px; margin: 16px 0 0; line-height: 1.6;">${text}</p>`;

// ── The two notifications ────────────────────────────────────────────────────

/**
 * Internal inboxes. Falls back through the CSR addresses to the SMTP sender, so an alert
 * always has somewhere to land even before VOLUNTEER_ALERT_EMAIL is set.
 */
const internalRecipients = () => {
    const connect = process.env.VOLUNTEER_ALERT_EMAIL
        || process.env.CSR_CONNECT_EMAIL
        || process.env.SMTP_FROM
        || process.env.SMTP_USER;
    return [...new Set([connect].filter(Boolean))];
};

/** Registration receipt for the volunteer, carrying the ID they were shown on screen. */
const sendAcknowledgement = async (volunteer) => {
    if (!volunteer.email) return false;

    const bodyHtml = [
        eyebrow('Volunteer registration received'),
        greeting(`Hello ${escapeHtml(volunteer.full_name)},`),
        paragraph('Thank you for registering to volunteer with ICE. Your registration has been recorded and our team will be in touch with the next orientation date.'),
        referenceBlock('Your volunteer ID', volunteer.volunteer_id),
        paragraph('Please keep this ID — quote it in any correspondence with us, and bring a government-issued ID proof to your first session.'),
        detailTable([
            ['Area of interest', volunteer.area_of_interest],
            ['Role of interest', volunteer.role_of_interest],
            ['Availability', availability(volunteer)],
        ]),
        closingNote('If any of these details are wrong, reply to this email and we will correct them.'),
    ].join('\n');

    await emailService.sendWrappedEmail({
        to: volunteer.email,
        subject: `Welcome to ICE — your volunteer ID is ${volunteer.volunteer_id}`,
        bodyHtml,
    });
    return true;
};

/** Alert for the internal inboxes, with the full record and a link to it. */
const sendInternalAlert = async (volunteer) => {
    const to = internalRecipients().join(', ');
    if (!to) return false;

    const bodyHtml = [
        eyebrow('New volunteer registration'),
        paragraph(`<strong>${escapeHtml(volunteer.full_name)}</strong> has registered as a volunteer.`),
        detailTable(detailRows(volunteer)),
        button('Open volunteer record', adminLink(volunteer.id)),
    ].join('\n');

    await emailService.sendWrappedEmail({
        to,
        subject: `New volunteer: ${volunteer.full_name} (${volunteer.volunteer_id})`,
        bodyHtml,
        // Reply-to the volunteer so a team member can answer straight from the alert.
        replyTo: volunteer.email,
    });
    return true;
};

/**
 * Fire the registration notifications without blocking the HTTP response.
 *
 * The volunteer is already committed by this point: they must get their ID even if SMTP
 * is down, so delivery failures are logged, not surfaced.
 */
const notifyNewRegistration = (volunteer) => {
    Promise.allSettled([
        sendAcknowledgement(volunteer),
        sendInternalAlert(volunteer),
    ]).then(([ack, alert]) => {
        // Log both outcomes: a silent success is indistinguishable from a process that
        // died mid-send, which makes "did it actually go?" unanswerable after the fact.
        const outcome = (label, r) => r.status === 'fulfilled'
            ? console.log(`Volunteer ${volunteer.volunteer_id}: ${label} ${r.value ? 'sent' : 'skipped (no recipient)'}`)
            : console.error(`Volunteer ${volunteer.volunteer_id}: ${label} FAILED —`, r.reason?.message || r.reason);
        outcome('acknowledgement', ack);
        outcome('internal alert', alert);
    });
};

module.exports = {
    sendAcknowledgement,
    sendInternalAlert,
    notifyNewRegistration,
    internalRecipients,
};
