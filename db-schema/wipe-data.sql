-- Wipe all data EXCEPT admin_users
-- Run with: mysql -u <user> -p <database> < wipe-data.sql

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE referral_points_history;
TRUNCATE TABLE certificate_requests;
TRUNCATE TABLE push_subscriptions;
TRUNCATE TABLE event_registrations;
TRUNCATE TABLE donations;
TRUNCATE TABLE otp_verifications;
TRUNCATE TABLE events;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;
