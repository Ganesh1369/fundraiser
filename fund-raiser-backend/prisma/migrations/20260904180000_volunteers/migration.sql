-- Volunteer Workstream 2: registration form data store.

CREATE TABLE `volunteers` (
    `id`            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    -- Human-facing sequential reference, e.g. ICE-VOL-2026-0001.
    `volunteer_id`  VARCHAR(30) NOT NULL UNIQUE,

    -- ── Mandatory ────────────────────────────────────────────────────────────
    `full_name`     VARCHAR(150) NOT NULL,
    `date_of_birth` DATE NOT NULL,
    -- Unique so a second registration is rejected rather than silently duplicating a
    -- person. The service checks first to return a friendly per-field message; these
    -- indexes are the guard against two simultaneous submissions slipping past that check.
    `email`         VARCHAR(255) NOT NULL UNIQUE,
    `phone`         VARCHAR(20)  NOT NULL UNIQUE,
    `city`          VARCHAR(100) NOT NULL,
    `pincode`       VARCHAR(10)  NOT NULL,
    `occupation_type` ENUM('student', 'working', 'other') NOT NULL,
    -- Institution for a student, employer for someone working.
    `institution`   VARCHAR(200) NOT NULL,

    -- Availability: either or both day types, plus an hours-per-week figure.
    `available_weekday` BOOLEAN NOT NULL DEFAULT false,
    `available_weekend` BOOLEAN NOT NULL DEFAULT false,
    `hours_per_week`    INT NOT NULL,

    -- Which kind of work they want. Mirrors the focus areas on the volunteer page and is
    -- what the admin master filters on.
    `area_of_interest`  VARCHAR(150) NOT NULL,
    -- Set when they applied from a specific opportunity card.
    `role_of_interest`  VARCHAR(200) NULL,

    -- ── Student-only ─────────────────────────────────────────────────────────
    `college_name`  VARCHAR(200) NULL,
    `course`        VARCHAR(150) NULL,

    -- ── Optional ─────────────────────────────────────────────────────────────
    `languages`     VARCHAR(255) NULL,
    `message`       TEXT NULL,

    -- ── Emergency contact ────────────────────────────────────────────────────
    `emergency_name`         VARCHAR(150) NOT NULL,
    `emergency_relationship` VARCHAR(100) NOT NULL,
    `emergency_phone`        VARCHAR(20)  NOT NULL,

    -- ── Consent ──────────────────────────────────────────────────────────────
    -- Stored per checkbox rather than as one flag: these are separate permissions, and
    -- photo/media consent in particular has to be answerable on its own later.
    `consent_code_of_conduct` BOOLEAN NOT NULL DEFAULT false,
    `consent_data_use`        BOOLEAN NOT NULL DEFAULT false,
    `consent_photo_media`     BOOLEAN NOT NULL DEFAULT false,

    -- ── Uploads ──────────────────────────────────────────────────────────────
    `photo_stored_name`      VARCHAR(255) NULL,
    `photo_original_name`    VARCHAR(255) NULL,
    `photo_mime_type`        VARCHAR(100) NULL,
    `photo_size_bytes`       INT NULL,
    `id_proof_stored_name`   VARCHAR(255) NULL,
    `id_proof_original_name` VARCHAR(255) NULL,
    `id_proof_mime_type`     VARCHAR(100) NULL,
    `id_proof_size_bytes`    INT NULL,

    -- Admin master's active/inactive flag — a visibility toggle, not a workflow.
    `is_active`     BOOLEAN NOT NULL DEFAULT true,

    -- Abuse forensics for the public endpoint.
    `source_ip`     VARCHAR(45) NULL,
    `user_agent`    VARCHAR(255) NULL,

    `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_volunteers_active`     ON `volunteers` (`is_active`);
CREATE INDEX `idx_volunteers_city`       ON `volunteers` (`city`);
CREATE INDEX `idx_volunteers_pincode`    ON `volunteers` (`pincode`);
CREATE INDEX `idx_volunteers_occupation` ON `volunteers` (`occupation_type`);
CREATE INDEX `idx_volunteers_area`       ON `volunteers` (`area_of_interest`);
CREATE INDEX `idx_volunteers_created_at` ON `volunteers` (`created_at`);

-- Per-year sequence for volunteer_id, mirroring csr_enquiry_counters. A dedicated counter
-- rather than MAX(volunteer_id)+1 so concurrent registrations cannot mint the same number.
CREATE TABLE `volunteer_counters` (
    `year`     INT PRIMARY KEY,
    `last_seq` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
