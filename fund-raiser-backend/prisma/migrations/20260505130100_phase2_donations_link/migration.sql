-- Phase 2.1 Day 2: donations.project_id FK + points_formula_version.
-- - project_id: nullable; existing rows backfilled to ROOTS in 20260505130200_phase2_backfill_project_id.
-- - points_formula_version: TINYINT default 2 (new ₹100 = 1 point). Day-5 backfill flips pre-cutover rows back to 1.

ALTER TABLE `donations`
    ADD COLUMN `project_id` CHAR(36) NULL AFTER `event_id`,
    ADD COLUMN `points_formula_version` TINYINT UNSIGNED NOT NULL DEFAULT 2 AFTER `points_awarded`;

ALTER TABLE `donations`
    ADD CONSTRAINT `fk_donations_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX `idx_donations_project_id` ON `donations`(`project_id`);
