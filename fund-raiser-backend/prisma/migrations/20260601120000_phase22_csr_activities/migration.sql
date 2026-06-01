-- Phase 2.2 Day 1: csr_activities — admin-managed CSR partner cards rendered as a
-- horizontal carousel on the user dashboard. Hand-written migration (matches the
-- CsrActivity model in schema.prisma).

CREATE TABLE `csr_activities` (
    `id`             CHAR(36)     NOT NULL DEFAULT (UUID()),
    `title`          VARCHAR(200) NOT NULL,
    `subtitle`       VARCHAR(255) NULL,
    `partner_name`   VARCHAR(150) NULL,
    `logo_url`       VARCHAR(500) NULL,
    `hero_image_url` VARCHAR(500) NULL,
    `summary`        TEXT         NULL,
    `link_url`       VARCHAR(500) NULL,
    `display_order`  INT          NOT NULL DEFAULT 0,
    `is_active`      BOOLEAN      NOT NULL DEFAULT TRUE,
    `created_at`     DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at`     DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`),
    INDEX `idx_csr_activities_is_active`     (`is_active`),
    INDEX `idx_csr_activities_display_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
