-- 2026-09-07: record who filled in each CSR enquiry and volunteer registration.
--
-- Values:
--   self — the person or company filled the public form themselves
--   ice  — an ICE admin entered it from the admin panel (walk-in, phone or email enquiry)
--
-- Set at INSERT time only and never mutated afterwards. The value is decided by which
-- endpoint was used, not by anything the client sends: the public routes always write
-- 'self', and only the admin routes behind verifyAdmin can write 'ice'.
--
-- Existing rows all predate the admin entry forms, so the 'self' default is correct
-- for them and no backfill is needed.
--
-- Idempotent so it can be re-applied safely on prod.

ALTER TABLE `csr_enquiries`
    ADD COLUMN IF NOT EXISTS `submitted_via`
        ENUM('self', 'ice') NOT NULL DEFAULT 'self' AFTER `user_agent`;

ALTER TABLE `volunteers`
    ADD COLUMN IF NOT EXISTS `submitted_via`
        ENUM('self', 'ice') NOT NULL DEFAULT 'self' AFTER `user_agent`;
