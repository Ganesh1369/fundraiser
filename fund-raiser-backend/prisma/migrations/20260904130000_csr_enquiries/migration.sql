-- Workstream 2: CSR enquiries captured from the public CSR Collaboration page.
--
-- Naming note: `main` carries a separate Phase 2.2 CSR body of work (`csr_activities`,
-- `corporate_profiles`, `csr_commitments`, `csr_commitment_tranches`). These branches are
-- deliberately kept apart, so everything here is namespaced `csr_enquiry*` and cannot
-- collide with it.

CREATE TABLE `csr_enquiries` (
    `id`                   CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    -- Human-facing sequential reference, e.g. ICE-CSR-2026-0001. Unique so a retry
    -- can never mint a duplicate.
    `csr_id`               VARCHAR(30) NOT NULL UNIQUE,

    -- Mandatory fields
    `company_name`         VARCHAR(200) NOT NULL,
    `contact_person`       VARCHAR(150) NOT NULL,
    `designation`          VARCHAR(150) NOT NULL,
    `email`                VARCHAR(255) NOT NULL,
    `phone`                VARCHAR(20)  NOT NULL,
    `budget`               DECIMAL(14,2) NOT NULL,
    `area_of_interest`     VARCHAR(150) NOT NULL,
    `preferred_project_id` CHAR(36) NULL,

    -- Optional fields
    `location`             VARCHAR(200) NULL,
    `message`              TEXT NULL,

    -- Workflow (13 stages; the admin module in Workstream 3 drives these)
    `status`               VARCHAR(40) NOT NULL DEFAULT 'new_enquiry',
    `status_reason`        VARCHAR(500) NULL,
    `owner_admin_id`       CHAR(36) NULL,

    -- Reserved link to main's `corporate_profiles`. Intentionally NOT a foreign key:
    -- that table does not exist on this branch. Whoever reconciles the branches later
    -- adds the constraint instead of restructuring this table.
    `corporate_profile_id` CHAR(36) NULL,

    -- Abuse forensics for the public endpoint
    `source_ip`            VARCHAR(45) NULL,
    `user_agent`           VARCHAR(255) NULL,

    `created_at`           DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at`           DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT `csr_enquiries_project_fk` FOREIGN KEY (`preferred_project_id`)
        REFERENCES `projects` (`id`) ON DELETE SET NULL,
    CONSTRAINT `csr_enquiries_owner_fk` FOREIGN KEY (`owner_admin_id`)
        REFERENCES `admin_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_csr_enquiries_status`     ON `csr_enquiries` (`status`);
CREATE INDEX `idx_csr_enquiries_owner`      ON `csr_enquiries` (`owner_admin_id`);
CREATE INDEX `idx_csr_enquiries_project`    ON `csr_enquiries` (`preferred_project_id`);
CREATE INDEX `idx_csr_enquiries_created_at` ON `csr_enquiries` (`created_at`);
CREATE INDEX `idx_csr_enquiries_email`      ON `csr_enquiries` (`email`);

-- Per-year sequence for csr_id. A dedicated counter rather than MAX(csr_id)+1 so two
-- concurrent submissions cannot read the same high-water mark and mint the same number.
CREATE TABLE `csr_enquiry_counters` (
    `year`     INT PRIMARY KEY,
    `last_seq` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
