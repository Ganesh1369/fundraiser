-- Phase 2.2 — tranched CSR donations.
-- A corporate donor pledges a total CSR amount (e.g. ₹50 lakh for FY 2026-27)
-- paid across scheduled tranches (e.g. quarterly ₹12.5L). Each tranche links
-- to a donations row once paid; CSR receipts are issued per tranche through
-- the existing certificate_requests pipeline (type='csr_receipt').

CREATE TABLE `csr_commitments` (
    `id`              CHAR(36)       NOT NULL,
    `user_id`         CHAR(36)       NOT NULL,
    `project_id`      CHAR(36)       NULL,
    `total_amount`    DECIMAL(15,2)  NOT NULL,
    `currency`        VARCHAR(3)     NOT NULL DEFAULT 'INR',
    `period_label`    VARCHAR(20)    NULL,           -- e.g. "FY 2026-27"
    `notes`           TEXT           NULL,           -- board resolution #, internal PO, etc.
    `status`          ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
    `created_by_admin_id` CHAR(36)   NULL,
    `created_at`      DATETIME(0)    NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at`      DATETIME(0)    NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`),
    INDEX `idx_csr_commitments_user`    (`user_id`),
    INDEX `idx_csr_commitments_project` (`project_id`),
    INDEX `idx_csr_commitments_status`  (`status`),
    CONSTRAINT `fk_csr_commitments_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT `fk_csr_commitments_project`
        FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `csr_commitment_tranches` (
    `id`              CHAR(36)       NOT NULL,
    `commitment_id`   CHAR(36)       NOT NULL,
    `sequence`        SMALLINT       NOT NULL,       -- 1, 2, 3, ... within a commitment
    `planned_amount`  DECIMAL(15,2)  NOT NULL,
    `planned_date`    DATE           NULL,           -- expected disbursement date
    `donation_id`     CHAR(36)       NULL,           -- set when this tranche is paid
    `status`          ENUM('scheduled','paid','skipped') NOT NULL DEFAULT 'scheduled',
    `paid_at`         DATETIME(0)    NULL,
    `notes`           VARCHAR(255)   NULL,
    `created_at`      DATETIME(0)    NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at`      DATETIME(0)    NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_tranche_seq_per_commitment` (`commitment_id`, `sequence`),
    INDEX `idx_csr_tranches_commitment` (`commitment_id`),
    INDEX `idx_csr_tranches_donation`   (`donation_id`),
    INDEX `idx_csr_tranches_status`     (`status`),
    CONSTRAINT `fk_csr_tranches_commitment`
        FOREIGN KEY (`commitment_id`) REFERENCES `csr_commitments` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT `fk_csr_tranches_donation`
        FOREIGN KEY (`donation_id`) REFERENCES `donations` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
