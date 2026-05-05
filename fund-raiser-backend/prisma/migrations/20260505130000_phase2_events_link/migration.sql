-- Phase 2.1 Day 2: events.project_id FK + richer event-page fields (hero banner, schedule, venue, contact).
-- project_id is nullable; existing rows will be backfilled to ROOTS by 20260505130200_phase2_backfill_project_id.

ALTER TABLE `events`
    ADD COLUMN `project_id` CHAR(36) NULL AFTER `id`,
    ADD COLUMN `hero_banner_url` VARCHAR(500) NULL,
    ADD COLUMN `schedule` TEXT NULL,
    ADD COLUMN `venue_details` TEXT NULL,
    ADD COLUMN `contact_name` VARCHAR(100) NULL,
    ADD COLUMN `contact_phone` VARCHAR(20) NULL,
    ADD COLUMN `contact_email` VARCHAR(255) NULL;

ALTER TABLE `events`
    ADD CONSTRAINT `fk_events_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX `idx_events_project_id` ON `events`(`project_id`);
