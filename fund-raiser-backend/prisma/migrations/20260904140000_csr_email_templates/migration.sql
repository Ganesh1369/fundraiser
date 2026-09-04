-- Workstream 2: admin-editable, ICE-branded HTML email templates for CSR enquiries.
--
-- Only the inner body is stored. The outer ICE shell (navy header, logo, footer strip)
-- stays in email.service.js so a bad edit here can never break the branding — an admin
-- edits the message, not the chrome.
--
-- Placeholders are {{camelCase}} and substituted at send time. Unknown placeholders are
-- left as-is rather than blanked, so a typo is visible in a test send instead of silently
-- producing an empty line.

CREATE TABLE `csr_email_templates` (
    `template_key`  VARCHAR(50) PRIMARY KEY,
    `label`         VARCHAR(150) NOT NULL,
    `description`   VARCHAR(300) NULL,
    `subject`       VARCHAR(255) NOT NULL,
    `body_html`     TEXT NOT NULL,
    `placeholders`  VARCHAR(600) NOT NULL,
    `is_active`     BOOLEAN NOT NULL DEFAULT true,
    `updated_at`    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by`    CHAR(36) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `csr_email_templates`
    (`template_key`, `label`, `description`, `subject`, `placeholders`, `body_html`) VALUES

('enquiry_acknowledgement',
 'Enquiry acknowledgement (to enquirer)',
 'Sent to the person who submitted the CSR enquiry form, confirming their reference number.',
 'We have received your CSR enquiry — {{csrId}}',
 'csrId, companyName, contactPerson, designation, email, phone, budget, areaOfInterest, projectName, location, message, submittedAt',
 '<p style="color: #525252; margin: 0 0 16px; font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">CSR Enquiry Received</p>
<p style="color: #171717; font-size: 15px; margin: 0 0 4px;">Dear <strong>{{contactPerson}}</strong>,</p>
<p style="color: #525252; font-size: 14px; margin: 0 0 20px; line-height: 1.6;">Thank you for your interest in partnering with ICE. We have received your CSR enquiry on behalf of <strong>{{companyName}}</strong>, and our partnerships team will be in touch shortly.</p>
<div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 20px;">
    <p style="color: #171717; margin: 0 0 8px; font-size: 13px;">Your reference number</p>
    <h2 style="color: #16a34a; margin: 0; font-size: 26px; letter-spacing: 2px; font-weight: 700;">{{csrId}}</h2>
</div>
<p style="color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin: 0 0 10px;">What you sent us</p>
<table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;">
    <tr><td style="padding: 6px 0; color: #737373; font-size: 13px; width: 42%;">Area of interest</td><td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">{{areaOfInterest}}</td></tr>
    <tr><td style="padding: 6px 0; color: #737373; font-size: 13px;">Preferred programme</td><td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">{{projectName}}</td></tr>
    <tr><td style="padding: 6px 0; color: #737373; font-size: 13px;">Indicative budget</td><td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">{{budget}}</td></tr>
    <tr><td style="padding: 6px 0; color: #737373; font-size: 13px;">Submitted on</td><td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">{{submittedAt}}</td></tr>
</table>
<p style="color: #737373; font-size: 13px; margin: 0; line-height: 1.6;">Please quote <strong style="color: #525252;">{{csrId}}</strong> in any correspondence. ICE is CSR-1 registered and holds 12A, 80G and Section 8 status — the full compliance pack is available on request.</p>'),

('internal_alert',
 'New enquiry alert (to internal inboxes)',
 'Sent to the Communications and Connect inboxes whenever a new CSR enquiry arrives.',
 'New CSR enquiry — {{companyName}} ({{csrId}})',
 'csrId, companyName, contactPerson, designation, email, phone, budget, areaOfInterest, projectName, location, message, submittedAt, adminLink',
 '<p style="color: #525252; margin: 0 0 16px; font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">New CSR Enquiry</p>
<div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 18px; text-align: center; margin: 0 0 20px;">
    <h2 style="color: #102a43; margin: 0 0 4px; font-size: 18px; font-weight: 700;">{{companyName}}</h2>
    <p style="color: #16a34a; margin: 0; font-size: 14px; font-weight: 600; letter-spacing: 1px;">{{csrId}}</p>
</div>
<table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;">
    <tr><td style="padding: 6px 0; color: #737373; font-size: 13px; width: 42%;">Contact</td><td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">{{contactPerson}}, {{designation}}</td></tr>
    <tr><td style="padding: 6px 0; color: #737373; font-size: 13px;">Email</td><td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">{{email}}</td></tr>
    <tr><td style="padding: 6px 0; color: #737373; font-size: 13px;">Phone</td><td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">{{phone}}</td></tr>
    <tr><td style="padding: 6px 0; color: #737373; font-size: 13px;">Budget</td><td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">{{budget}}</td></tr>
    <tr><td style="padding: 6px 0; color: #737373; font-size: 13px;">Area of interest</td><td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">{{areaOfInterest}}</td></tr>
    <tr><td style="padding: 6px 0; color: #737373; font-size: 13px;">Preferred programme</td><td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">{{projectName}}</td></tr>
    <tr><td style="padding: 6px 0; color: #737373; font-size: 13px;">Location</td><td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">{{location}}</td></tr>
    <tr><td style="padding: 6px 0; color: #737373; font-size: 13px;">Submitted</td><td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">{{submittedAt}}</td></tr>
</table>
<p style="color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin: 0 0 6px;">Message</p>
<p style="color: #525252; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">{{message}}</p>
<div style="text-align:center; margin: 24px 0 8px;"><a href="{{adminLink}}" style="display:inline-block; background:#22c55e; color:#ffffff; padding:12px 28px; border-radius:10px; text-decoration:none; font-weight:600; font-size:14px;">Open in admin &rarr;</a></div>'),

('assignment',
 'Assignment notice (to the owner)',
 'Sent to an admin when a CSR enquiry is assigned to them as owner.',
 'CSR enquiry assigned to you — {{csrId}}',
 'csrId, companyName, contactPerson, email, phone, budget, areaOfInterest, projectName, ownerName, adminLink',
 '<p style="color: #525252; margin: 0 0 16px; font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Enquiry Assigned</p>
<p style="color: #171717; font-size: 15px; margin: 0 0 4px;">Hi <strong>{{ownerName}}</strong>,</p>
<p style="color: #525252; font-size: 14px; margin: 0 0 20px; line-height: 1.6;">You are now the owner of the CSR enquiry from <strong>{{companyName}}</strong>.</p>
<div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 18px; text-align: center; margin: 0 0 20px;">
    <p style="color: #16a34a; margin: 0; font-size: 16px; font-weight: 700; letter-spacing: 1px;">{{csrId}}</p>
</div>
<table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;">
    <tr><td style="padding: 6px 0; color: #737373; font-size: 13px; width: 42%;">Contact</td><td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">{{contactPerson}}</td></tr>
    <tr><td style="padding: 6px 0; color: #737373; font-size: 13px;">Email</td><td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">{{email}}</td></tr>
    <tr><td style="padding: 6px 0; color: #737373; font-size: 13px;">Budget</td><td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">{{budget}}</td></tr>
    <tr><td style="padding: 6px 0; color: #737373; font-size: 13px;">Preferred programme</td><td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">{{projectName}}</td></tr>
</table>
<div style="text-align:center; margin: 24px 0 8px;"><a href="{{adminLink}}" style="display:inline-block; background:#22c55e; color:#ffffff; padding:12px 28px; border-radius:10px; text-decoration:none; font-weight:600; font-size:14px;">Open enquiry &rarr;</a></div>'),

('status_change',
 'Status change alert (internal)',
 'Sent when a CSR enquiry moves to a new stage. Which stages trigger it is configurable in the admin module.',
 'CSR enquiry {{csrId}} moved to {{status}}',
 'csrId, companyName, status, statusReason, ownerName, adminLink',
 '<p style="color: #525252; margin: 0 0 16px; font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Status Updated</p>
<p style="color: #525252; font-size: 14px; margin: 0 0 20px; line-height: 1.6;">The CSR enquiry from <strong>{{companyName}}</strong> has moved to a new stage.</p>
<div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 20px;">
    <p style="color: #737373; margin: 0 0 6px; font-size: 13px;">{{csrId}} is now</p>
    <h2 style="color: #16a34a; margin: 0; font-size: 20px; font-weight: 700;">{{status}}</h2>
</div>
<table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;">
    <tr><td style="padding: 6px 0; color: #737373; font-size: 13px; width: 42%;">Reason</td><td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">{{statusReason}}</td></tr>
    <tr><td style="padding: 6px 0; color: #737373; font-size: 13px;">Owner</td><td style="padding: 6px 0; color: #171717; font-size: 13px; font-weight: 600;">{{ownerName}}</td></tr>
</table>
<div style="text-align:center; margin: 24px 0 8px;"><a href="{{adminLink}}" style="display:inline-block; background:#22c55e; color:#ffffff; padding:12px 28px; border-radius:10px; text-decoration:none; font-weight:600; font-size:14px;">Open enquiry &rarr;</a></div>');
