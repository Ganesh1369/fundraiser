-- Move the hardcoded CSR and Volunteer page content into the database, so it is editable
-- from the admin panel like every other page on the site.
--
-- Seeds reproduce exactly what was previously in the components, so nothing changes
-- visually — this migration only moves where the content lives.
--
-- Colours are stored as an `accent` key ('primary', 'blue', 'green', 'amber', 'purple',
-- 'rose'), never as Tailwind class names: a class string in the database would break
-- silently the next time the design system changed.

-- ── CSR opportunity cards ────────────────────────────────────────────────────
-- These belong on the project itself: the same ROOTS row already drives its landing page.
ALTER TABLE `projects`
    ADD COLUMN `focus_area` VARCHAR(120) NULL AFTER `mission`,
    -- JSON array of strings, e.g. ["Fund a plantation drive", "Employee volunteering day"].
    ADD COLUMN `contribution_modes` JSON NULL AFTER `focus_area`;

UPDATE `projects` SET
    `focus_area` = 'Environment',
    `contribution_modes` = JSON_ARRAY(
        'Fund a plantation drive',
        'Sponsor a school green belt',
        'Employee volunteering day',
        'Adopt a native-species nursery'
    )
WHERE `slug` = 'roots';

UPDATE `projects` SET
    `focus_area` = 'Animal Welfare',
    `contribution_modes` = JSON_ARRAY(
        'Sponsor animal care & feed',
        'Fund a habitat enrichment project',
        'Support conservation awareness camps',
        'Employee engagement visit'
    )
WHERE `slug` = 'zoo';

-- ── "Areas of contribution" tiles on the CSR page ────────────────────────────
CREATE TABLE `csr_focus_areas` (
    `id`            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `title`         VARCHAR(120) NOT NULL,
    `description`   VARCHAR(500) NOT NULL,
    `icon`          VARCHAR(50) NOT NULL DEFAULT 'leaf',
    `accent`        VARCHAR(20) NOT NULL DEFAULT 'primary',
    `display_order` INT NOT NULL DEFAULT 0,
    `is_active`     BOOLEAN NOT NULL DEFAULT true,
    `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_csr_focus_areas_order` ON `csr_focus_areas` (`is_active`, `display_order`);

INSERT INTO `csr_focus_areas` (`title`, `description`, `icon`, `accent`, `display_order`) VALUES
    ('Environment & Sustainability', 'Afforestation, native-species restoration and urban green cover.', 'leaf', 'primary', 1),
    ('Education & Skilling', 'Learning infrastructure, environmental literacy and rural skilling.', 'school', 'blue', 2),
    ('Community Health', 'Preventive health camps, clean water access and nutrition support.', 'heart', 'rose', 3),
    ('Rural Development', 'Livelihood generation, farmer support and rural infrastructure.', 'sprout', 'amber', 4),
    ('Animal Welfare', 'Habitat protection, animal care and conservation awareness.', 'shield-check', 'purple', 5),
    ('Employee Engagement', 'Volunteering days, team plantation drives and field visits.', 'users', 'green', 6);

-- ── Volunteer opportunity cards ──────────────────────────────────────────────
CREATE TABLE `volunteer_roles` (
    `id`            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `title`         VARCHAR(150) NOT NULL,
    -- Doubles as the Area of Interest options on the registration form and the admin filter.
    `focus_area`    VARCHAR(120) NOT NULL,
    `location`      VARCHAR(200) NOT NULL,
    `commitment`    VARCHAR(200) NOT NULL,
    `description`   VARCHAR(500) NOT NULL,
    `icon`          VARCHAR(50) NOT NULL DEFAULT 'users',
    `accent`        VARCHAR(20) NOT NULL DEFAULT 'primary',
    `display_order` INT NOT NULL DEFAULT 0,
    `is_active`     BOOLEAN NOT NULL DEFAULT true,
    `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_volunteer_roles_order` ON `volunteer_roles` (`is_active`, `display_order`);

INSERT INTO `volunteer_roles`
    (`title`, `focus_area`, `location`, `commitment`, `description`, `icon`, `accent`, `display_order`) VALUES
    ('Plantation Drive Volunteer', 'Environment', 'Chennai & surrounding districts', 'Weekends · 4–6 hours per drive',
     'Join native-species planting drives — pit digging, sapling placement, mulching and geo-tagging each tree.', 'sprout', 'primary', 1),
    ('Nursery Care Volunteer', 'Environment', 'ICE nursery, Chennai', 'Weekdays · 3–4 hours per week',
     'Look after saplings between drives — watering, repotting, shade management and survival record-keeping.', 'leaf', 'green', 2),
    ('School Green Club Mentor', 'Education', 'Partner schools', 'Weekdays · 2–3 hours per week',
     'Run environmental sessions with school green clubs and support students through their own campus projects.', 'school', 'blue', 3),
    ('Animal Care Assistant', 'Animal Welfare', 'ICE ZOO', 'Flexible · 4 hours per week',
     'Assist the care team with feeding routines, enclosure enrichment and visitor awareness sessions.', 'shield-check', 'purple', 4),
    ('Event Support Volunteer', 'Community', 'Event locations across the city', 'Event days · one-off or recurring',
     'Help run marathons, awareness camps and donor events — registration desks, wayfinding and participant support.', 'calendar', 'amber', 5),
    ('Content & Outreach Volunteer', 'Communications', 'Remote', 'Flexible · 3–5 hours per week',
     'Write field stories, edit drive photography and help grow ICE reach on social channels.', 'megaphone', 'rose', 6);

-- ── "Who can apply" tiles on the volunteer page ──────────────────────────────
CREATE TABLE `volunteer_eligibility` (
    `id`            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `title`         VARCHAR(150) NOT NULL,
    `description`   VARCHAR(500) NOT NULL,
    `icon`          VARCHAR(50) NOT NULL DEFAULT 'circle-check',
    `display_order` INT NOT NULL DEFAULT 0,
    `is_active`     BOOLEAN NOT NULL DEFAULT true,
    `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_volunteer_eligibility_order` ON `volunteer_eligibility` (`is_active`, `display_order`);

INSERT INTO `volunteer_eligibility` (`title`, `description`, `icon`, `display_order`) VALUES
    ('Aged 16 and above', 'Anyone 16 or older can apply. Applicants under 18 need a parent or guardian to countersign the consent form.', 'user-plus', 1),
    ('Students and professionals', 'College students, working professionals, homemakers and retirees are all welcome — no background is a prerequisite.', 'graduation-cap', 2),
    ('No experience needed', 'Every role comes with an orientation and a field lead. Bring willingness; we will cover the rest.', 'heart', 3),
    ('A realistic commitment', 'Tell us honestly how many hours you can give. A dependable two hours beats an optimistic ten.', 'clock', 4),
    ('Code of conduct', 'All volunteers agree to the ICE code of conduct, covering safety, child protection and respectful field behaviour.', 'shield-check', 5),
    ('Valid ID proof', 'A government-issued ID is required at registration — Aadhaar, PAN, passport, or a student ID card.', 'file-text', 6);
