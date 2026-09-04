-- Workstream 2 follow-up: make the CSR email templates editable without HTML.
--
-- The previous shape stored a raw `body_html` blob, which meant a comms person had to edit
-- `<p style="...">` tags to change a sentence. This replaces it with named fields that the
-- server assembles into the ICE-branded layout, so the editor shows plain text and
-- checkboxes and no markup can be broken by an edit.

ALTER TABLE `csr_email_templates`
    -- Small uppercase label above the message, e.g. "CSR Enquiry Received".
    ADD COLUMN `eyebrow`           VARCHAR(100) NULL AFTER `subject`,
    -- Salutation line, e.g. "Dear {{contactPerson}},". Blank to omit.
    ADD COLUMN `greeting`          VARCHAR(255) NULL AFTER `eyebrow`,
    -- Body copy as plain text. One paragraph per line.
    ADD COLUMN `message`           TEXT NULL AFTER `greeting`,
    -- The highlighted green panel.
    ADD COLUMN `show_reference`    BOOLEAN NOT NULL DEFAULT true AFTER `message`,
    ADD COLUMN `reference_caption` VARCHAR(150) NULL AFTER `show_reference`,
    ADD COLUMN `reference_value`   VARCHAR(100) NULL AFTER `reference_caption`,
    -- The label/value table. `detail_fields` is a comma-separated list of placeholder
    -- keys; their display labels live in csr-enquiry-email.service.js so an admin picks
    -- from checkboxes rather than typing field names.
    ADD COLUMN `show_detail_table` BOOLEAN NOT NULL DEFAULT true AFTER `reference_value`,
    ADD COLUMN `detail_fields`     VARCHAR(500) NULL AFTER `show_detail_table`,
    -- The green call-to-action button. Always links to the enquiry's admin record.
    ADD COLUMN `show_button`       BOOLEAN NOT NULL DEFAULT false AFTER `detail_fields`,
    ADD COLUMN `button_label`      VARCHAR(80) NULL AFTER `show_button`,
    -- Small print under everything.
    ADD COLUMN `closing_note`      TEXT NULL AFTER `button_label`;

UPDATE `csr_email_templates` SET
    `eyebrow`           = 'CSR Enquiry Received',
    `greeting`          = 'Dear {{contactPerson}},',
    `message`           = 'Thank you for your interest in partnering with ICE. We have received your CSR enquiry on behalf of {{companyName}}, and our partnerships team will be in touch shortly.',
    `show_reference`    = true,
    `reference_caption` = 'Your reference number',
    `reference_value`   = '{{csrId}}',
    `show_detail_table` = true,
    `detail_fields`     = 'areaOfInterest,projectName,budget,submittedAt',
    `show_button`       = false,
    `button_label`      = NULL,
    `closing_note`      = 'Please quote {{csrId}} in any correspondence. ICE is CSR-1 registered and holds 12A, 80G and Section 8 status — the full compliance pack is available on request.'
WHERE `template_key` = 'enquiry_acknowledgement';

UPDATE `csr_email_templates` SET
    `eyebrow`           = 'New CSR Enquiry',
    `greeting`          = NULL,
    `message`           = 'A new CSR enquiry has arrived from {{companyName}}.',
    `show_reference`    = true,
    `reference_caption` = '{{companyName}}',
    `reference_value`   = '{{csrId}}',
    `show_detail_table` = true,
    `detail_fields`     = 'contactPerson,designation,email,phone,budget,areaOfInterest,projectName,location,submittedAt,message',
    `show_button`       = true,
    `button_label`      = 'Open in admin',
    `closing_note`      = NULL
WHERE `template_key` = 'internal_alert';

UPDATE `csr_email_templates` SET
    `eyebrow`           = 'Enquiry Assigned',
    `greeting`          = 'Hi {{ownerName}},',
    `message`           = 'You are now the owner of the CSR enquiry from {{companyName}}.',
    `show_reference`    = true,
    `reference_caption` = 'Reference',
    `reference_value`   = '{{csrId}}',
    `show_detail_table` = true,
    `detail_fields`     = 'contactPerson,email,budget,projectName',
    `show_button`       = true,
    `button_label`      = 'Open enquiry',
    `closing_note`      = NULL
WHERE `template_key` = 'assignment';

UPDATE `csr_email_templates` SET
    `eyebrow`           = 'Status Updated',
    `greeting`          = NULL,
    `message`           = 'The CSR enquiry from {{companyName}} has moved to a new stage.',
    `show_reference`    = true,
    `reference_caption` = '{{csrId}} is now',
    `reference_value`   = '{{status}}',
    `show_detail_table` = true,
    `detail_fields`     = 'statusReason,ownerName',
    `show_button`       = true,
    `button_label`      = 'Open enquiry',
    `closing_note`      = NULL
WHERE `template_key` = 'status_change';

-- The raw-HTML column is what this change exists to remove.
ALTER TABLE `csr_email_templates` DROP COLUMN `body_html`;
