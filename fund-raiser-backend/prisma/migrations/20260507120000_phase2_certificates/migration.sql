-- Phase 2.1 Day 4: certificate PDF metadata, cert number sequence, retry counters.
-- - certificate_number: unique, format ICE/80G/<FY>/<seq>; populated at generate time.
-- - pdf_url: relative path to the generated PDF (e.g. uploads/certificates/<userId>/<certId>.pdf).
-- - auto_generated: true when triggered by webhook/verify; false for admin-initiated.
-- - generation_attempts / last_generation_error: power Regenerate retries and admin visibility.
-- - issued_at: set when status flips to 'approved' on successful generation.

ALTER TABLE `certificate_requests`
    ADD COLUMN `certificate_number` VARCHAR(50) NULL,
    ADD COLUMN `pdf_url` VARCHAR(500) NULL,
    ADD COLUMN `auto_generated` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `generation_attempts` INT NOT NULL DEFAULT 0,
    ADD COLUMN `last_generation_error` TEXT NULL,
    ADD COLUMN `issued_at` DATETIME NULL;

CREATE UNIQUE INDEX `idx_certificate_requests_number` ON `certificate_requests`(`certificate_number`);
