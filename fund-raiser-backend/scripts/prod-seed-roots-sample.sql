-- =====================================================================
-- Sample seed — ROOTS project with rich content + accomplishments
-- Target: u378384838_icefdb (Hostinger prod)
-- Run in: phpMyAdmin → SQL tab → paste → Go
--
-- Idempotent: re-running overwrites the ROOTS row's content fields and
-- replaces its accomplishments. Safe to run multiple times.
--
-- Prerequisite: projects table has a row with slug='roots' (the stub
-- created by the 20260505120000_phase2_projects migration). If it
-- doesn't exist this script inserts it.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Ensure ROOTS row exists, then populate with full content.
-- ---------------------------------------------------------------------
INSERT INTO `projects` (`slug`, `name`, `display_order`, `is_active`)
SELECT 'roots', 'ROOTS', 1, true
WHERE NOT EXISTS (SELECT 1 FROM `projects` WHERE `slug` = 'roots');

-- logo_url and banner_urls left NULL until real artwork is uploaded via the
-- admin Projects UI. Templates fall back to a name-initial tile when null.
UPDATE `projects`
SET
    `name`        = 'ROOTS',
    `tagline`     = 'Reclaiming our city, one tree at a time.',
    `logo_url`    = NULL,
    `description` = 'ROOTS is ICE Network''s urban reforestation and community greening pillar. We work with residents, schools, and local bodies to plant native trees, restore neglected green spaces, and build long-term stewardship of the urban canopy across our city.',
    `vision`      = 'A city where every neighbourhood is shaded by native trees, where children grow up alongside the species their grandparents knew, and where green space is not a privilege but a shared civic right.',
    `mission`     = 'Plant the right tree in the right place, with the right people. ROOTS partners with schools, RWAs, and municipal bodies to run native-species drives, train volunteer canopy stewards, and maintain a public map of every tree planted — from sapling to maturity.',
    `banner_urls` = NULL,
    `display_order` = 1,
    `is_active`     = true
WHERE `slug` = 'roots';

-- ---------------------------------------------------------------------
-- 2. Replace ROOTS accomplishments.
--    Capture id into a session var so the FK insert can reference it.
-- ---------------------------------------------------------------------
SET @roots_id := (SELECT `id` FROM `projects` WHERE `slug` = 'roots');

DELETE FROM `accomplishments` WHERE `project_id` = @roots_id;

INSERT INTO `accomplishments`
    (`project_id`, `title`, `description`, `metric_value`, `metric_unit`, `icon`, `display_order`)
VALUES
    (@roots_id, 'Trees Planted',
        'Native saplings planted across schools, parks, and roadside avenues since 2023.',
        '12500', 'trees', 'tree', 1),
    (@roots_id, 'Schools Engaged',
        'Government and private schools running ROOTS curriculum and tree-care clubs.',
        '48', 'schools', 'school', 2),
    (@roots_id, 'Active Volunteers',
        'Trained canopy stewards maintaining trees in their own neighbourhoods.',
        '1200', 'volunteers', 'users', 3),
    (@roots_id, 'Green Cover Restored',
        'Reclaimed acres of degraded or barren urban land returned to native green cover.',
        '34', 'acres', 'leaf', 4),
    (@roots_id, 'Native Species',
        'Distinct native species planted — biodiversity-first, no invasive monocultures.',
        '62', 'species', 'sprout', 5),
    (@roots_id, 'Sapling Survival Rate',
        'Year-1 survival rate, tracked via the public ROOTS tree map.',
        '87', '%', 'chart', 6);

-- ---------------------------------------------------------------------
-- 3. Verification — should show the populated row + 6 accomplishments.
-- ---------------------------------------------------------------------
SELECT `slug`, `name`, `tagline`, `display_order`, `is_active`,
       CHAR_LENGTH(`description`) AS desc_len,
       CHAR_LENGTH(`vision`)      AS vision_len,
       CHAR_LENGTH(`mission`)     AS mission_len,
       JSON_LENGTH(`banner_urls`) AS banner_count
FROM `projects` WHERE `slug` = 'roots';

SELECT `title`, `metric_value`, `metric_unit`, `icon`, `display_order`
FROM `accomplishments`
WHERE `project_id` = (SELECT `id` FROM `projects` WHERE `slug` = 'roots')
ORDER BY `display_order`;
