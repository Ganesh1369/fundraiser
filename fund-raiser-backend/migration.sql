-- Fund Raiser Platform - Database Migration
-- Run this against your PostgreSQL database before testing

-- Enable uuid extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- OTP verifications table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('register', 'reset_password')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_email_purpose ON otp_verifications(email, purpose);

-- Add email_verified column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Add request_80g column to donations
ALTER TABLE donations ADD COLUMN IF NOT EXISTS request_80g BOOLEAN DEFAULT false;

-- Add donation_id column to certificate_requests (link certificate to specific donation)
ALTER TABLE certificate_requests ADD COLUMN IF NOT EXISTS donation_id UUID REFERENCES donations(id);

-- Update leaderboard view with extra fields
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
    u.id,
    u.name,
    u.user_type,
    u.email,
    u.city,
    u.referral_points,
    COALESCE(SUM(d.amount) FILTER (WHERE d.status = 'completed'), 0) as total_donations,
    COUNT(d.id) FILTER (WHERE d.status = 'completed') as donation_count,
    (COALESCE(SUM(d.amount) FILTER (WHERE d.status = 'completed'), 0) + u.referral_points) as score
FROM users u
LEFT JOIN donations d ON u.id = d.user_id
WHERE u.is_active = true
GROUP BY u.id, u.name, u.user_type, u.email, u.city, u.referral_points
ORDER BY score DESC;

-- Clean up expired OTPs (run periodically)
-- DELETE FROM otp_verifications WHERE expires_at < NOW() - INTERVAL '24 hours';
