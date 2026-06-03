-- Phase 2.2: CSR donations — extend donations.purpose enum and add a CSR-specific
-- reference number column for corporates' internal tracking (PO #, CSR-1 sanction
-- letter ref, board resolution #, etc). Tagging a donation as 'csr_donation' is
-- what gates the Form CSR-2 receipt pipeline (next session) and the co-branding
-- of corporate sponsors on project pages.

ALTER TABLE `donations`
    MODIFY COLUMN `purpose` ENUM('donation','registration_fee','csr_donation')
        NOT NULL DEFAULT 'donation';

ALTER TABLE `donations`
    ADD COLUMN `csr_reference_number` VARCHAR(50) NULL AFTER `purpose`;

-- Index for project-page co-branding queries (group CSR donations by project)
CREATE INDEX `idx_donations_purpose_project` ON `donations` (`purpose`, `project_id`);
