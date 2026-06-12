-- Soft lead capture for ungated visitors on /projects/:slug and /events/:slug.
-- When a stranger lands on a share link (often with UTMs from social/whatsapp)
-- and isn't ready to donate, the page offers "want updates on this project?".
-- We collect email/phone + attribution and let admin email/push them later.

CREATE TABLE `share_leads` (
    `id`              CHAR(36)       NOT NULL,
    `email`           VARCHAR(255)   NULL,
    `phone`           VARCHAR(20)    NULL,
    `name`            VARCHAR(150)   NULL,
    `project_id`      CHAR(36)       NULL,
    `event_id`        CHAR(36)       NULL,
    `utm_source`      VARCHAR(100)   NULL,
    `utm_medium`      VARCHAR(100)   NULL,
    `utm_campaign`    VARCHAR(150)   NULL,
    `utm_content`     VARCHAR(150)   NULL,
    `referrer_url`    VARCHAR(500)   NULL,
    `landing_path`    VARCHAR(300)   NULL,
    `opted_in_push`   TINYINT(1)     NOT NULL DEFAULT 0,
    `converted_user_id` CHAR(36)     NULL,           -- set if this lead later registers
    `created_at`      DATETIME(0)    NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`),
    INDEX `idx_share_leads_email`   (`email`),
    INDEX `idx_share_leads_phone`   (`phone`),
    INDEX `idx_share_leads_project` (`project_id`),
    INDEX `idx_share_leads_event`   (`event_id`),
    INDEX `idx_share_leads_created` (`created_at`),
    CONSTRAINT `fk_share_leads_project`
        FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT `fk_share_leads_event`
        FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT `fk_share_leads_user`
        FOREIGN KEY (`converted_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
