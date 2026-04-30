-- Baseline migration — matches production state as of 2026-04-30.
--
-- For prod (already in this state):
--   npx prisma migrate resolve --applied "0_init"
--
-- For a fresh dev DB:
--   npx prisma migrate deploy
--   (this will run the SQL below)

-- CreateTable: admin_users
CREATE TABLE `admin_users` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `username` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(100) NULL,
    `email` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `username`(`username`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CreateTable: users
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `user_type` ENUM('student', 'individual', 'organization') NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `age` INTEGER NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `class_grade` VARCHAR(50) NULL,
    `school_name` VARCHAR(200) NULL,
    `address_line_1` VARCHAR(255) NULL,
    `address_line_2` VARCHAR(255) NULL,
    `area` VARCHAR(100) NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `pincode` VARCHAR(10) NULL,
    `country` VARCHAR(100) NULL DEFAULT 'India',
    `organization_name` VARCHAR(200) NULL,
    `pan_number` VARCHAR(20) NULL,
    `pan_document_url` VARCHAR(500) NULL,
    `referral_code` VARCHAR(20) NOT NULL,
    `referred_by` CHAR(36) NULL,
    `referral_points` INTEGER NOT NULL DEFAULT 0,
    `profile_pic` VARCHAR(500) NULL,
    `email_verified` BOOLEAN NOT NULL DEFAULT false,
    `registration_fee_paid` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `email`(`email`),
    UNIQUE INDEX `referral_code`(`referral_code`),
    INDEX `idx_users_referral_code`(`referral_code`),
    INDEX `idx_users_referred_by`(`referred_by`),
    INDEX `idx_users_user_type`(`user_type`),
    INDEX `idx_users_email`(`email`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CreateTable: events
CREATE TABLE `events` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `event_name` VARCHAR(150) NOT NULL,
    `event_type` ENUM('marathon', 'cyclothon', 'walkathon') NOT NULL,
    `event_date` DATE NOT NULL,
    `event_location` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `banner_url` VARCHAR(500) NULL,
    `registration_open` BOOLEAN NOT NULL DEFAULT true,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    INDEX `idx_events_is_active`(`is_active`),
    INDEX `idx_events_registration_open`(`registration_open`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CreateTable: event_registrations
CREATE TABLE `event_registrations` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `event_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `date_of_birth` DATE NOT NULL,
    `gender` ENUM('male', 'female', 'other') NOT NULL,
    `blood_group` VARCHAR(5) NULL,
    `emergency_contact_name` VARCHAR(100) NULL,
    `emergency_contact_phone` VARCHAR(20) NULL,
    `emergency_contact_relationship` VARCHAR(50) NULL,
    `experience_level` ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
    `medical_conditions` TEXT NULL,
    `allergies` TEXT NULL,
    `on_medication` BOOLEAN NOT NULL DEFAULT false,
    `address_line_1` VARCHAR(255) NULL,
    `address_line_2` VARCHAR(255) NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `pin_code` VARCHAR(20) NULL,
    `country` VARCHAR(100) NULL DEFAULT 'India',
    `fitness_declaration` BOOLEAN NOT NULL DEFAULT false,
    `terms_accepted` BOOLEAN NOT NULL DEFAULT true,
    `registration_status` ENUM('registered', 'cancelled') NOT NULL DEFAULT 'registered',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `idx_event_registrations_unique`(`event_id`, `user_id`),
    INDEX `idx_event_registrations_event_id`(`event_id`),
    INDEX `idx_event_registrations_user_id`(`user_id`),
    INDEX `idx_event_registrations_status`(`registration_status`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CreateTable: donations
CREATE TABLE `donations` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `user_id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(3) NULL DEFAULT 'INR',
    `num_trees` INTEGER UNSIGNED NULL,
    `razorpay_order_id` VARCHAR(100) NULL,
    `razorpay_payment_id` VARCHAR(100) NULL,
    `razorpay_signature` VARCHAR(255) NULL,
    `status` VARCHAR(20) NULL DEFAULT 'pending',
    `referrer_id` CHAR(36) NULL,
    `points_awarded` BOOLEAN NOT NULL DEFAULT false,
    `purpose` ENUM('donation', 'registration_fee') NOT NULL DEFAULT 'donation',
    `request_80g` BOOLEAN NOT NULL DEFAULT false,
    `payment_method` VARCHAR(50) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    INDEX `idx_donations_user_id`(`user_id`),
    INDEX `idx_donations_event_id`(`event_id`),
    INDEX `idx_donations_referrer_id`(`referrer_id`),
    INDEX `idx_donations_created_at`(`created_at`),
    INDEX `idx_donations_status`(`status`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CreateTable: referral_points_history
CREATE TABLE `referral_points_history` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `user_id` CHAR(36) NOT NULL,
    `donation_id` CHAR(36) NOT NULL,
    `points_earned` INTEGER NOT NULL,
    `donor_name` VARCHAR(100) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_referral_points_user_id`(`user_id`),
    INDEX `donation_id`(`donation_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CreateTable: certificate_requests
CREATE TABLE `certificate_requests` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `user_id` CHAR(36) NOT NULL,
    `donation_id` CHAR(36) NULL,
    `pan_number` VARCHAR(20) NOT NULL,
    `status` ENUM('pending', 'processing', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `admin_notes` TEXT NULL,
    `certificate_url` VARCHAR(500) NULL,
    `requested_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `processed_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `idx_certificate_requests_donation`(`donation_id`),
    INDEX `idx_certificate_requests_user_id`(`user_id`),
    INDEX `idx_certificate_requests_status`(`status`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CreateTable: push_subscriptions
CREATE TABLE `push_subscriptions` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `user_id` CHAR(36) NOT NULL,
    `endpoint` TEXT NOT NULL,
    `p256dh` VARCHAR(255) NOT NULL,
    `auth` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `unique_push_user`(`user_id`),
    INDEX `idx_push_subscriptions_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CreateTable: otp_verifications
CREATE TABLE `otp_verifications` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `email` VARCHAR(255) NOT NULL,
    `otp` VARCHAR(10) NOT NULL,
    `purpose` VARCHAR(20) NOT NULL DEFAULT 'register',
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `expires_at` DATETIME(0) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_otp_verifications_email`(`email`),
    INDEX `idx_otp_verifications_email_purpose`(`email`, `purpose`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AddForeignKey: users.referred_by -> users.id
ALTER TABLE `users` ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`referred_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: event_registrations
ALTER TABLE `event_registrations` ADD CONSTRAINT `event_registrations_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `event_registrations` ADD CONSTRAINT `event_registrations_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey: donations
ALTER TABLE `donations` ADD CONSTRAINT `donations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `donations` ADD CONSTRAINT `donations_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `donations` ADD CONSTRAINT `donations_ibfk_3` FOREIGN KEY (`referrer_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: referral_points_history
ALTER TABLE `referral_points_history` ADD CONSTRAINT `referral_points_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `referral_points_history` ADD CONSTRAINT `referral_points_history_ibfk_2` FOREIGN KEY (`donation_id`) REFERENCES `donations`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey: certificate_requests
ALTER TABLE `certificate_requests` ADD CONSTRAINT `certificate_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `certificate_requests` ADD CONSTRAINT `certificate_requests_ibfk_2` FOREIGN KEY (`donation_id`) REFERENCES `donations`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: push_subscriptions
ALTER TABLE `push_subscriptions` ADD CONSTRAINT `push_subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- CreateView: leaderboard
CREATE OR REPLACE VIEW `leaderboard` AS
SELECT
    u.id, u.name, u.email, u.city, u.user_type, u.referral_points,
    COALESCE(SUM(CASE WHEN d.status = 'completed' AND d.purpose = 'donation' THEN d.amount ELSE 0 END), 0) AS total_donations,
    SUM(CASE WHEN d.status = 'completed' AND d.purpose = 'donation' THEN 1 ELSE 0 END) AS donation_count,
    COALESCE(SUM(CASE WHEN d.status = 'completed' AND d.purpose = 'donation' THEN d.amount ELSE 0 END), 0) + u.referral_points AS score
FROM users u
LEFT JOIN donations d ON u.id = d.user_id
WHERE u.is_active = 1
GROUP BY u.id, u.name, u.email, u.city, u.user_type, u.referral_points
ORDER BY score DESC;

-- CreateView: leaderboard_view (includes phone, referral_code, total_trees; does NOT filter is_active)
CREATE OR REPLACE VIEW `leaderboard_view` AS
SELECT
    u.id, u.name, u.email, u.phone, u.referral_code, u.referral_points,
    COALESCE(SUM(CASE WHEN d.status = 'completed' AND d.purpose = 'donation' THEN d.amount ELSE 0 END), 0) AS total_donations,
    SUM(CASE WHEN d.status = 'completed' AND d.purpose = 'donation' THEN 1 ELSE 0 END) AS donation_count,
    COALESCE(SUM(CASE WHEN d.status = 'completed' AND d.purpose = 'donation' THEN d.num_trees ELSE 0 END), 0) AS total_trees,
    COALESCE(SUM(CASE WHEN d.status = 'completed' AND d.purpose = 'donation' THEN d.amount ELSE 0 END), 0) + u.referral_points AS score
FROM users u
LEFT JOIN donations d ON u.id = d.user_id
GROUP BY u.id;
