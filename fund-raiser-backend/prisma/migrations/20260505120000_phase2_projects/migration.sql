-- Phase 2.1: projects + accomplishments. First-class project entities seeded with ROOTS and ZOO.
-- Hand-written migration to match the Project / Accomplishment models in schema.prisma.
-- Day-2 migration adds events.project_id and donations.project_id FKs (referenced here for context only).

-- CreateTable: projects
CREATE TABLE `projects` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `slug` VARCHAR(100) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `tagline` VARCHAR(255) NULL,
    `logo_url` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `vision` TEXT NULL,
    `mission` TEXT NULL,
    `banner_urls` JSON NULL,
    `display_order` INT NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `slug`(`slug`),
    INDEX `idx_projects_is_active`(`is_active`),
    INDEX `idx_projects_slug`(`slug`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CreateTable: accomplishments
CREATE TABLE `accomplishments` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `project_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `metric_value` VARCHAR(50) NULL,
    `metric_unit` VARCHAR(50) NULL,
    `icon` VARCHAR(50) NULL,
    `display_order` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    INDEX `idx_accomplishments_project_id`(`project_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `accomplishments` ADD CONSTRAINT `accomplishments_ibfk_1`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- Seed initial projects with placeholder content. Admin fills in tagline / vision / mission / banners
-- via the admin Projects UI. Public pages render whatever is currently in the DB on every request.
INSERT INTO `projects` (`slug`, `name`, `display_order`, `is_active`) VALUES
    ('roots', 'ROOTS', 1, true),
    ('zoo',   'ZOO',   2, true);
