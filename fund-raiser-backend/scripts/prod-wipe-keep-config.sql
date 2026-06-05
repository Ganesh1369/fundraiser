-- =====================================================================
-- Prod data wipe — keep admin + config/seed only
-- Target: u378384838_icefdb (Hostinger prod)
-- Run in: phpMyAdmin → SQL tab → paste → Go
--
-- KEEPS:   admin_users, projects, org_settings, accomplishments
-- WIPES:   users, events, event_registrations, donations,
--          referral_points_history, certificate_requests,
--          push_subscriptions, otp_verifications
--
-- TRUNCATE resets AUTO_INCREMENT, so new rows start at 1.
-- FK checks are disabled for the duration so order doesn't matter.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE referral_points_history;
TRUNCATE TABLE certificate_requests;
TRUNCATE TABLE event_registrations;
TRUNCATE TABLE donations;
TRUNCATE TABLE events;
TRUNCATE TABLE push_subscriptions;
TRUNCATE TABLE otp_verifications;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- Verification — every wiped table should report 0;
-- kept tables should report their seed counts.
-- ---------------------------------------------------------------------
SELECT 'users'                    AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'events',                  COUNT(*) FROM events
UNION ALL SELECT 'event_registrations',     COUNT(*) FROM event_registrations
UNION ALL SELECT 'donations',               COUNT(*) FROM donations
UNION ALL SELECT 'referral_points_history', COUNT(*) FROM referral_points_history
UNION ALL SELECT 'certificate_requests',    COUNT(*) FROM certificate_requests
UNION ALL SELECT 'push_subscriptions',      COUNT(*) FROM push_subscriptions
UNION ALL SELECT 'otp_verifications',       COUNT(*) FROM otp_verifications
UNION ALL SELECT 'admin_users (kept)',      COUNT(*) FROM admin_users
UNION ALL SELECT 'projects (kept)',         COUNT(*) FROM projects
UNION ALL SELECT 'org_settings (kept)',     COUNT(*) FROM org_settings
UNION ALL SELECT 'accomplishments (kept)',  COUNT(*) FROM accomplishments;
