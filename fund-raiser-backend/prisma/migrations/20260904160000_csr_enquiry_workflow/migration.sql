-- Workstream 3: the admin CSR module — workflow, notes, documents, milestones, audit log.

-- ── Roles ────────────────────────────────────────────────────────────────────
-- The scope asks for access "tied to existing admin/sub-admin roles", but no role concept
-- exists on this branch. Defaulting every current account to 'admin' keeps today's
-- behaviour exactly as it is; 'sub_admin' is the reduced-permission tier the CSR module
-- checks against.
ALTER TABLE `admin_users`
    ADD COLUMN `role` ENUM('admin', 'sub_admin') NOT NULL DEFAULT 'admin' AFTER `email`;

-- ── Money on the enquiry ─────────────────────────────────────────────────────
-- `budget` is what the company indicated at enquiry time. These two are what was actually
-- agreed and what has actually arrived — the pipeline report contrasts them.
ALTER TABLE `csr_enquiries`
    ADD COLUMN `committed_amount` DECIMAL(14,2) NULL AFTER `budget`,
    ADD COLUMN `received_amount`  DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER `committed_amount`;

-- ── Internal notes ───────────────────────────────────────────────────────────
CREATE TABLE `csr_enquiry_notes` (
    `id`          CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `enquiry_id`  CHAR(36) NOT NULL,
    `admin_id`    CHAR(36) NULL,
    -- Denormalised so a note keeps its attribution even if the account is later removed.
    `author_name` VARCHAR(100) NOT NULL,
    `body`        TEXT NOT NULL,
    `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT `csr_notes_enquiry_fk` FOREIGN KEY (`enquiry_id`)
        REFERENCES `csr_enquiries` (`id`) ON DELETE CASCADE,
    CONSTRAINT `csr_notes_admin_fk` FOREIGN KEY (`admin_id`)
        REFERENCES `admin_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_csr_notes_enquiry` ON `csr_enquiry_notes` (`enquiry_id`, `created_at`);

-- ── Documents ────────────────────────────────────────────────────────────────
CREATE TABLE `csr_enquiry_documents` (
    `id`             CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `enquiry_id`     CHAR(36) NOT NULL,
    `admin_id`       CHAR(36) NULL,
    `uploader_name`  VARCHAR(100) NOT NULL,
    `original_name`  VARCHAR(255) NOT NULL,
    `stored_name`    VARCHAR(255) NOT NULL,
    `mime_type`      VARCHAR(100) NOT NULL,
    `size_bytes`     INT NOT NULL,
    `created_at`     DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT `csr_docs_enquiry_fk` FOREIGN KEY (`enquiry_id`)
        REFERENCES `csr_enquiries` (`id`) ON DELETE CASCADE,
    CONSTRAINT `csr_docs_admin_fk` FOREIGN KEY (`admin_id`)
        REFERENCES `admin_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_csr_docs_enquiry` ON `csr_enquiry_documents` (`enquiry_id`, `created_at`);

-- ── Milestones ───────────────────────────────────────────────────────────────
CREATE TABLE `csr_enquiry_milestones` (
    `id`          CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `enquiry_id`  CHAR(36) NOT NULL,
    `title`       VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    -- Target vs actual: the gap between them is the whole point of the table.
    `target_date` DATE NULL,
    `actual_date` DATE NULL,
    `status`      ENUM('pending', 'in_progress', 'completed', 'missed') NOT NULL DEFAULT 'pending',
    `sort_order`  INT NOT NULL DEFAULT 0,
    `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT `csr_milestones_enquiry_fk` FOREIGN KEY (`enquiry_id`)
        REFERENCES `csr_enquiries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_csr_milestones_enquiry` ON `csr_enquiry_milestones` (`enquiry_id`, `sort_order`);

-- ── Activity log ─────────────────────────────────────────────────────────────
-- Immutable by contract: the service only ever INSERTs, and nothing exposes an update or
-- delete route. Rows survive deletion of the acting admin, and are cascaded only with the
-- enquiry itself.
CREATE TABLE `csr_enquiry_activity_log` (
    `id`          CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `enquiry_id`  CHAR(36) NOT NULL,
    `admin_id`    CHAR(36) NULL,
    `actor_name`  VARCHAR(100) NOT NULL,
    `action`      VARCHAR(50) NOT NULL,
    `summary`     VARCHAR(500) NOT NULL,
    `from_value`  VARCHAR(255) NULL,
    `to_value`    VARCHAR(255) NULL,
    `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT `csr_log_enquiry_fk` FOREIGN KEY (`enquiry_id`)
        REFERENCES `csr_enquiries` (`id`) ON DELETE CASCADE,
    CONSTRAINT `csr_log_admin_fk` FOREIGN KEY (`admin_id`)
        REFERENCES `admin_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_csr_log_enquiry` ON `csr_enquiry_activity_log` (`enquiry_id`, `created_at`);

-- ── Which stages send an alert ───────────────────────────────────────────────
-- Completes the "configurable status-change alerts" item: a row per stage, toggled by an
-- admin. Seeded so the stages that matter commercially are on and routine ones are off.
CREATE TABLE `csr_status_alert_config` (
    `status`       VARCHAR(40) PRIMARY KEY,
    `notify_owner` BOOLEAN NOT NULL DEFAULT true,
    `notify_team`  BOOLEAN NOT NULL DEFAULT false,
    `updated_at`   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `csr_status_alert_config` (`status`, `notify_owner`, `notify_team`) VALUES
    ('new_enquiry',       false, false),
    ('acknowledged',      true,  false),
    ('qualified',         true,  false),
    ('proposal_shared',   true,  true),
    ('under_review',      true,  false),
    ('negotiation',       true,  false),
    ('approved',          true,  true),
    ('mou_signed',        true,  true),
    ('funds_awaited',     true,  false),
    ('funds_received',    true,  true),
    ('implementation',    true,  false),
    ('impact_reporting',  true,  false),
    ('closed_renewal',    true,  true);
