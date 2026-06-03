-- Phase 2.2: corporate_profiles — 1:1 sidecar to users where user_type='organization'.
-- Holds CSR-compliance fields (CIN, GSTIN, CSR-1 registration number) plus authorized
-- signatory details required for CSR donation receipts (Form CSR-2 PDF, next session).
-- All fields nullable so existing organization rows continue to work without backfill.

CREATE TABLE `corporate_profiles` (
    `user_id`                          CHAR(36)     NOT NULL,
    `cin`                              VARCHAR(21)  NULL,
    `gstin`                            VARCHAR(15)  NULL,
    `csr_registration_number`          VARCHAR(50)  NULL,
    `incorporated_year`                SMALLINT     NULL,
    `industry`                         VARCHAR(100) NULL,
    `authorized_signatory_name`        VARCHAR(150) NULL,
    `authorized_signatory_designation` VARCHAR(150) NULL,
    `authorized_signatory_email`       VARCHAR(255) NULL,
    `authorized_signatory_phone`       VARCHAR(20)  NULL,
    `created_at`                       DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at`                       DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`user_id`),
    INDEX `idx_corporate_profiles_cin`   (`cin`),
    INDEX `idx_corporate_profiles_gstin` (`gstin`),
    CONSTRAINT `fk_corporate_profiles_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
