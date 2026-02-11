-- Fundraiser Platform Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for user types
CREATE TYPE user_type AS ENUM ('student', 'individual', 'organization');

-- Enum for certificate request status
CREATE TYPE certificate_status AS ENUM ('pending', 'processing', 'approved', 'rejected');

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_type user_type NOT NULL,
    
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
    referred_by UUID REFERENCES users(id),
    referral_points INTEGER DEFAULT 0,
    
    -- Email Verification
    email_verified BOOLEAN DEFAULT false,

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for referral lookups
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_referred_by ON users(referred_by);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_email ON users(email);

-- Donations Table
CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Payment Details
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- Razorpay Details
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, refunded
    
    -- Referral Attribution
    referrer_id UUID REFERENCES users(id),
    points_awarded BOOLEAN DEFAULT false,

    -- 80G Certificate Request Flag
    request_80g BOOLEAN DEFAULT false,
    
    -- Metadata
    payment_method VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for donation queries
CREATE INDEX idx_donations_user_id ON donations(user_id);
CREATE INDEX idx_donations_referrer_id ON donations(referrer_id);
CREATE INDEX idx_donations_created_at ON donations(created_at);
CREATE INDEX idx_donations_status ON donations(status);

-- Referral Points History Table
CREATE TABLE referral_points_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
    
    -- Points Details
    points_earned INTEGER NOT NULL,
    donor_name VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_referral_points_user_id ON referral_points_history(user_id);

-- 80G Certificate Requests Table
CREATE TABLE certificate_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    donation_id UUID REFERENCES donations(id),
    
    -- PAN Details
    pan_number VARCHAR(20) NOT NULL,
    
    -- Request Details
    status certificate_status DEFAULT 'pending',
    admin_notes TEXT,
    certificate_url VARCHAR(500),
    
    -- Metadata
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_certificate_requests_user_id ON certificate_requests(user_id);
CREATE INDEX idx_certificate_requests_status ON certificate_requests(status);

-- Admin Users Table
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Push Notification Subscriptions Table
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh VARCHAR(255) NOT NULL,
    auth VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- OTP Verifications Table
CREATE TABLE otp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    purpose VARCHAR(20) NOT NULL DEFAULT 'register', -- register, reset_password
    verified BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_verifications_email ON otp_verifications(email);
CREATE INDEX idx_otp_verifications_email_purpose ON otp_verifications(email, purpose);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON donations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certificate_requests_updated_at BEFORE UPDATE ON certificate_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Leaderboard View (for efficient querying)
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.city,
    u.user_type,
    u.referral_points,
    COALESCE(SUM(d.amount) FILTER (WHERE d.status = 'completed'), 0) as total_donations,
    COUNT(d.id) FILTER (WHERE d.status = 'completed') as donation_count,
    (COALESCE(SUM(d.amount) FILTER (WHERE d.status = 'completed'), 0) + u.referral_points) as score
FROM users u
LEFT JOIN donations d ON u.id = d.user_id
WHERE u.is_active = true
GROUP BY u.id, u.name, u.email, u.city, u.user_type, u.referral_points
ORDER BY score DESC;

-- Enum for event types
CREATE TYPE event_type_enum AS ENUM ('marathon', 'cyclothon', 'walkathon');

-- Enum for gender
CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');

-- Enum for experience level
CREATE TYPE experience_level_enum AS ENUM ('beginner', 'intermediate', 'advanced');

-- Enum for registration status
CREATE TYPE registration_status_enum AS ENUM ('registered', 'cancelled');

-- Events Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name VARCHAR(150) NOT NULL,
    event_type event_type_enum NOT NULL,
    event_date DATE NOT NULL,
    event_location VARCHAR(200) NOT NULL,
    description TEXT,
    banner_url VARCHAR(500),
    registration_open BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_is_active ON events(is_active);
CREATE INDEX idx_events_registration_open ON events(registration_open);

-- Event Registrations Table
CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Personal Details
    date_of_birth DATE NOT NULL,
    gender gender_enum NOT NULL,
    blood_group VARCHAR(5),
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    
    -- Event Specific Details
    experience_level experience_level_enum NOT NULL,
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
    registration_status registration_status_enum DEFAULT 'registered',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_event_registrations_unique ON event_registrations(event_id, user_id);
CREATE INDEX idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_user_id ON event_registrations(user_id);
CREATE INDEX idx_event_registrations_status ON event_registrations(registration_status);

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123 - should be changed in production)
-- Password hash for 'admin123' using bcrypt
INSERT INTO admin_users (username, password_hash, name, email) VALUES 
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Administrator', 'admin@fundraiser.com');
