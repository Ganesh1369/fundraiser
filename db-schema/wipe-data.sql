-- Wipe all data EXCEPT admin_users
-- Run with: psql -U <user> -d <database> -f wipe-data.sql

BEGIN;

-- Tables with foreign keys first (child → parent order)
TRUNCATE TABLE
    referral_points_history,
    certificate_requests,
    push_subscriptions,
    event_registrations,
    donations,
    otp_verifications,
    events,
    users
CASCADE;

COMMIT;
