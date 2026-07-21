-- 2026-07-21: offline donation support (cheque / cash / bank transfer / manual UPI) + reversal flow.
--
-- donations:
--   payment_reference     — free-text (cheque number, UTR, receipt no.). Displayed in admin list
--                            in place of razorpay_payment_id for offline rows.
--   payment_received_at   — the date the instrument was received (may pre-date created_at).
--   reversed_at           — set when admin marks a donation reversed (e.g. cheque bounced).
--   reversal_reason       — human-readable reason surfaced in admin history.
--   recorded_by_admin_id  — audit trail: which admin logged the offline payment.
--
-- certificate_requests:
--   'revoked' added to status enum; revoked_at + revoked_reason capture the reversal reference.
--
-- Idempotent (MariaDB `IF NOT EXISTS`) so it can be re-applied safely on prod.

ALTER TABLE `donations`
    ADD COLUMN IF NOT EXISTS `payment_reference` VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS `payment_received_at` DATE NULL,
    ADD COLUMN IF NOT EXISTS `reversed_at` DATETIME NULL,
    ADD COLUMN IF NOT EXISTS `reversal_reason` VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS `recorded_by_admin_id` CHAR(36) NULL;

ALTER TABLE `certificate_requests`
    MODIFY COLUMN `status` ENUM('pending', 'processing', 'approved', 'rejected', 'revoked') NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS `revoked_at` DATETIME NULL,
    ADD COLUMN IF NOT EXISTS `revoked_reason` VARCHAR(500) NULL;
