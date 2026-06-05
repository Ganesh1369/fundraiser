-- =====================================================================
-- Sample seed — ROOTS marathon event
-- Target: u378384838_icefdb (Hostinger prod)
-- Run in: phpMyAdmin → SQL tab → paste → Go
--
-- Idempotent: identified by event_name + project_id (ROOTS). Re-running
-- updates the existing row, doesn't create duplicates. Registrations
-- under this event are preserved.
--
-- Prerequisite: ROOTS project row exists (run prod-seed-roots-sample.sql
-- first, or rely on the original Phase 2.1 stub seed).
-- =====================================================================

SET @roots_id := (SELECT `id` FROM `projects` WHERE `slug` = 'roots');

-- Guard: bail with a clear error if ROOTS doesn't exist yet.
SELECT
    CASE WHEN @roots_id IS NULL
        THEN (SELECT 'ERROR: ROOTS project not found. Run prod-seed-roots-sample.sql first.' FROM `projects` WHERE 1=0)
        ELSE 'ok'
    END AS precheck;

SET @event_name := 'Run for ROOTS — Chennai City Marathon 2026';

-- ---------------------------------------------------------------------
-- 1. Insert the marathon if it doesn't exist yet.
-- ---------------------------------------------------------------------
INSERT INTO `events` (
    `project_id`, `event_name`, `event_type`, `event_date`, `event_location`,
    `registration_open`, `is_active`
)
SELECT
    @roots_id, @event_name, 'marathon', '2026-10-25', 'Chennai',
    true, true
WHERE NOT EXISTS (
    SELECT 1 FROM `events` WHERE `event_name` = @event_name AND `project_id` = @roots_id
);

-- ---------------------------------------------------------------------
-- 2. Populate / refresh full content.
-- ---------------------------------------------------------------------
UPDATE `events`
SET
    `event_type`        = 'marathon',
    `event_date`        = '2026-10-25',
    `event_location`    = 'Marina Beach, Chennai',
    `description`       = 'Lace up for the city you love. Run for ROOTS is a charity marathon raising funds and awareness for ICE Network''s urban reforestation work across Chennai. Every kilometre you run translates into a sapling planted in a city school, park, or neighbourhood. Four race categories — from a family-friendly 5K to a competitive full marathon — flagged off at sunrise from Marina Beach.',
    `banner_url`        = '/assets/events/run-for-roots-banner.jpg',
    `hero_banner_url`   = '/assets/events/run-for-roots-hero.jpg',
    `schedule`          = '04:30 AM — Gates open, bib collection & warm-up zone\n05:15 AM — Full Marathon (42.2 km) flag-off\n05:45 AM — Half Marathon (21.1 km) flag-off\n06:15 AM — 10K Run flag-off\n06:45 AM — 5K Family Run / Walk flag-off\n08:30 AM — Hydration stations & medical posts active across the route\n09:30 AM — Finisher medals, refreshments, and tree-pledge wall\n10:30 AM — Prize ceremony & ROOTS canopy stewards onboarding\n11:30 AM — Event close',
    `venue_details`     = 'Start & Finish: Marina Beach Promenade, opposite Anna Memorial.\nParking: Designated lots at Light House Metro Station and Triplicane (free for participants with bib).\nMetro: Light House (4 min walk) and Thirumayilai (8 min walk) on the Blue Line.\nAccessibility: 5K route is fully wheelchair- and stroller-friendly. Wheelchair start at 06:30 AM.\nKit collection: Friday 23 Oct & Saturday 24 Oct, 11 AM–8 PM at ICE Network office, Adyar.',
    `contact_name`      = 'ROOTS Events Team',
    `contact_phone`     = '+91 98404 71333',
    `contact_email`     = 'events@icenetwork.in',
    `registration_open` = true,
    `is_active`         = true
WHERE `event_name` = @event_name AND `project_id` = @roots_id;

-- ---------------------------------------------------------------------
-- 3. Verification — should show the populated marathon row.
-- ---------------------------------------------------------------------
SELECT
    e.`event_name`, e.`event_type`, e.`event_date`, e.`event_location`,
    e.`registration_open`, e.`is_active`,
    CHAR_LENGTH(e.`description`)   AS desc_len,
    CHAR_LENGTH(e.`schedule`)      AS schedule_len,
    CHAR_LENGTH(e.`venue_details`) AS venue_len,
    e.`contact_email`,
    p.`name` AS project_name
FROM `events` e
LEFT JOIN `projects` p ON p.`id` = e.`project_id`
WHERE e.`event_name` = @event_name AND e.`project_id` = @roots_id;
