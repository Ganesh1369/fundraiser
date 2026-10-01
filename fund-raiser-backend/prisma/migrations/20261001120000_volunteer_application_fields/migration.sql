-- The volunteer application form now also asks how the person wants to volunteer, for
-- how long, what skills they bring, and for a CV.
--
-- All four are optional, so every column is nullable and existing rows are untouched.

ALTER TABLE `volunteers`
    -- 'in_house' | 'remote' | 'hybrid' | 'field'. Kept as a string rather than an ENUM so
    -- a new way of volunteering does not need another migration.
    ADD COLUMN `volunteer_mode`     VARCHAR(20)   NULL AFTER `role_of_interest`,
    -- Free text ("3 months", "weekends until March") — the brief gives no fixed options.
    ADD COLUMN `preferred_duration` VARCHAR(100)  NULL AFTER `volunteer_mode`,
    ADD COLUMN `skills`             VARCHAR(1000) NULL AFTER `preferred_duration`,

    -- CV upload, stored like the photo and ID proof.
    ADD COLUMN `cv_stored_name`     VARCHAR(255)  NULL AFTER `id_proof_size_bytes`,
    ADD COLUMN `cv_original_name`   VARCHAR(255)  NULL AFTER `cv_stored_name`,
    ADD COLUMN `cv_mime_type`       VARCHAR(100)  NULL AFTER `cv_original_name`,
    ADD COLUMN `cv_size_bytes`      INT           NULL AFTER `cv_mime_type`;
