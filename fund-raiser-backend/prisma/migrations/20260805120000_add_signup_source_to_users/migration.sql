-- 2026-08-05: add users.signup_source to record which flow created each account.
--
-- Values:
--   register       — regular /register form (auth.service.js registerUser)
--   email_login    — passwordless /auth/email-login (quick-donate landing)
--   admin_offline  — admin-recorded offline donation created a stub donor
--   event_register — event self-registration form
--
-- Column is set at INSERT time only and never mutated afterwards. The stub-upgrade
-- path in /register (email_login stub → password account) preserves the original
-- 'email_login' source so admin reports still show "first appeared via quick-donate".
--
-- Backfill for existing rows:
--   - empty/NULL phone     → 'email_login' (only email-login stubs have empty phone)
--   - everything else      → 'register' (best-effort; historical admin_offline /
--     event_register rows can't be reliably distinguished after the fact, so they
--     stay at the default. New rows will be labeled correctly.)
--
-- Idempotent so it can be re-applied safely on prod.

ALTER TABLE `users`
    ADD COLUMN IF NOT EXISTS `signup_source`
        ENUM('register', 'email_login', 'admin_offline', 'event_register')
        NOT NULL DEFAULT 'register';

UPDATE `users`
   SET `signup_source` = 'email_login'
 WHERE (`phone` IS NULL OR `phone` = '')
   AND `signup_source` = 'register';
