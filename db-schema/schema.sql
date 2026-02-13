-- Fundraiser Platform Database Schema
-- MariaDB / MySQL

-- Users Table
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_type ENUM('student', 'individual', 'organization') NOT NULL,

    -- Personal Details
    name VARCHAR(100) NOT NULL,
    age INTEGER,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    -- Academic Information (for students)
    class_grade VARCHAR(50),
    school_name VARCHAR(200),

    -- Location Details
    area VARCHAR(100),
    locality VARCHAR(100),
    city VARCHAR(100),

    -- Organization Details (for organizations)
    organization_name VARCHAR(200),
    pan_number VARCHAR(20),
    pan_document_url VARCHAR(500),

    -- Referral System
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    referred_by CHAR(36),
    referral_points INTEGER DEFAULT 0,

    -- Profile
    profile_pic VARCHAR(500),

    -- Email Verification
    email_verified BOOLEAN DEFAULT false,

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (referred_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create indexes for user lookups
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_referred_by ON users(referred_by);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_email ON users(email);

-- Events Table
CREATE TABLE events (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    event_name VARCHAR(150) NOT NULL,
    event_type ENUM('marathon', 'cyclothon', 'walkathon') NOT NULL,
    event_date DATE NOT NULL,
    event_location VARCHAR(200) NOT NULL,
    description TEXT,
    banner_url VARCHAR(500),
    registration_open BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_events_is_active ON events(is_active);
CREATE INDEX idx_events_registration_open ON events(registration_open);

-- Event Registrations Table
CREATE TABLE event_registrations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    event_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,

    -- Personal Details
    date_of_birth DATE NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    blood_group VARCHAR(5),

    -- Emergency Contact
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),

    -- Event Specific Details
    experience_level ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
    medical_conditions TEXT,
    allergies TEXT,
    on_medication BOOLEAN DEFAULT false,

    -- Address
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pin_code VARCHAR(20),

    -- Consent
    fitness_declaration BOOLEAN DEFAULT false,
    terms_accepted BOOLEAN DEFAULT true,

    -- Status
    registration_status ENUM('registered', 'cancelled') DEFAULT 'registered',

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE UNIQUE INDEX idx_event_registrations_unique ON event_registrations(event_id, user_id);
CREATE INDEX idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_user_id ON event_registrations(user_id);
CREATE INDEX idx_event_registrations_status ON event_registrations(registration_status);

-- Donations Table
CREATE TABLE donations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    event_id CHAR(36),

    -- Payment Details
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',

    -- Razorpay Details
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),

    -- Status
    status VARCHAR(20) DEFAULT 'pending',

    -- Referral Attribution
    referrer_id CHAR(36),
    points_awarded BOOLEAN DEFAULT false,

    -- 80G Certificate Request Flag
    request_80g BOOLEAN DEFAULT false,

    -- Metadata
    payment_method VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (referrer_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create indexes for donation queries
CREATE INDEX idx_donations_user_id ON donations(user_id);
CREATE INDEX idx_donations_event_id ON donations(event_id);
CREATE INDEX idx_donations_referrer_id ON donations(referrer_id);
CREATE INDEX idx_donations_created_at ON donations(created_at);
CREATE INDEX idx_donations_status ON donations(status);

-- Referral Points History Table
CREATE TABLE referral_points_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    donation_id CHAR(36) NOT NULL,

    -- Points Details
    points_earned INTEGER NOT NULL,
    donor_name VARCHAR(100),

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_referral_points_user_id ON referral_points_history(user_id);

-- 80G Certificate Requests Table
CREATE TABLE certificate_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    donation_id CHAR(36),

    -- PAN Details
    pan_number VARCHAR(20) NOT NULL,

    -- Request Details
    status ENUM('pending', 'processing', 'approved', 'rejected') DEFAULT 'pending',
    admin_notes TEXT,
    certificate_url VARCHAR(500),

    -- Metadata
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (donation_id) REFERENCES donations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_certificate_requests_user_id ON certificate_requests(user_id);
CREATE INDEX idx_certificate_requests_status ON certificate_requests(status);

-- Admin Users Table
CREATE TABLE admin_users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Push Notification Subscriptions Table
CREATE TABLE push_subscriptions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh VARCHAR(255) NOT NULL,
    auth VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_push_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- OTP Verifications Table
CREATE TABLE otp_verifications (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    purpose VARCHAR(20) NOT NULL DEFAULT 'register',
    verified BOOLEAN DEFAULT false,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_otp_verifications_email ON otp_verifications(email);
CREATE INDEX idx_otp_verifications_email_purpose ON otp_verifications(email, purpose);

-- Leaderboard View (for efficient querying)
CREATE OR REPLACE VIEW leaderboard AS
SELECT
    u.id,
    u.name,
    u.email,
    u.city,
    u.user_type,
    u.referral_points,
    COALESCE(SUM(CASE WHEN d.status = 'completed' THEN d.amount ELSE 0 END), 0) AS total_donations,
    SUM(CASE WHEN d.status = 'completed' THEN 1 ELSE 0 END) AS donation_count,
    (COALESCE(SUM(CASE WHEN d.status = 'completed' THEN d.amount ELSE 0 END), 0) + u.referral_points) AS score
FROM users u
LEFT JOIN donations d ON u.id = d.user_id
WHERE u.is_active = true
GROUP BY u.id, u.name, u.email, u.city, u.user_type, u.referral_points
ORDER BY score DESC;

-- Insert default admin user (password: admin123 - should be changed in production)
-- Password hash for 'admin123' using bcrypt
INSERT INTO admin_users (username, password_hash, name, email) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Administrator', 'admin@fundraiser.com');
