-- Phase 2.1 Day 2: backfill historical events + donations to the ROOTS project.
-- Locked decision (PHASE-2-PLAN.md §14, 2026-04-30): historical rows default to ROOTS.

UPDATE `events`
SET `project_id` = (SELECT `id` FROM `projects` WHERE `slug` = 'roots')
WHERE `project_id` IS NULL;

UPDATE `donations`
SET `project_id` = (SELECT `id` FROM `projects` WHERE `slug` = 'roots')
WHERE `project_id` IS NULL;
