-- =====================================================================
-- Export: local `users` → prod (phpMyAdmin paste-and-run)
-- Generated: 2026-06-11T08:32:38.689Z
-- Rows: 12
--
-- WHAT THIS DOES:
--   INSERT IGNORE into `users` — preserves ids, password_hash, PAN,
--   phone, addresses, referral graph. Duplicates (by email or
--   referral_code) are silently skipped, so rerunning is safe.
--
-- SAFETY:
--   - FOREIGN_KEY_CHECKS=0 around the batch so the self-ref
--     `referred_by` FK never blocks an insert.
--   - Does NOT touch donations, certs, referral_points_history,
--     event_registrations, push_subscriptions, or admins.
--
-- BEFORE RUNNING:
--   1. Take a fresh prod DB backup (phpMyAdmin → Export → SQL).
--   2. Verify the row count below matches what you intend to push.
--   3. Confirm none of these emails should be a NEW prod signup —
--      a real user signing up with the same email AFTER this paste
--      will hit `Duplicate entry` and fail at registration.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Batch 1 — 12 row(s)
INSERT IGNORE INTO `users` (`id`, `user_type`, `name`, `age`, `email`, `phone`, `password_hash`, `class_grade`, `school_name`, `address_line_1`, `address_line_2`, `area`, `city`, `state`, `pincode`, `country`, `organization_name`, `pan_number`, `pan_document_url`, `referral_code`, `referred_by`, `referral_points`, `profile_pic`, `email_verified`, `registration_fee_paid`, `is_active`, `created_at`) VALUES
  ('290ee4e0-256d-4bf7-aee7-45de12454280', 'individual', 'Kamalraj', 25, 'kamalrajganesan2000@gmail.com', '8056221146', '$2b$12$s55g3ZgWCD0fqNwHJgvT7uslyfgg5PBys/iCcl.OofWKCNLyR7TH6', '', '', '6, Agatheeswarar Kovil Street', 'Kamarajar Highroad', 'Old Perungalathur', 'Chennai', 'Tamil Nadu', '600063', 'India', '', 'JJGPK1654F', NULL, 'FRHZXZXO', NULL, 50, NULL, 1, 0, 1, '2026-06-03 08:32:29'),
  ('0c8b3897-891b-4fbe-93ae-e808bfe0e21c', 'student', 'Divya Krishnan', NULL, 'demo+divya@icenetwork.in', '9800000008', '$2b$10$TlVB6O4vj0opYBqxOgFDy.QcGr9cg64tzo2YiS.WOTy5/YQjEff1m', NULL, NULL, NULL, NULL, NULL, 'Coimbatore', NULL, NULL, 'India', NULL, NULL, NULL, 'DEMODIVYA', NULL, 0, NULL, 1, 0, 1, '2026-06-11 08:25:55'),
  ('49cb7161-a136-4d1a-a7d7-47a14d5db076', 'individual', 'Priya Sharma', NULL, 'demo+priya@icenetwork.in', '9800000000', '$2b$10$TlVB6O4vj0opYBqxOgFDy.QcGr9cg64tzo2YiS.WOTy5/YQjEff1m', NULL, NULL, NULL, NULL, NULL, 'Chennai', NULL, NULL, 'India', NULL, NULL, NULL, 'DEMOPRIYA', NULL, 204, NULL, 1, 0, 1, '2026-06-11 08:25:55'),
  ('b7ddcc84-6b91-4469-9013-a451c73ecb61', 'individual', 'Rohan Desai', NULL, 'demo+rohan@icenetwork.in', '9800000007', '$2b$10$TlVB6O4vj0opYBqxOgFDy.QcGr9cg64tzo2YiS.WOTy5/YQjEff1m', NULL, NULL, NULL, NULL, NULL, 'Ahmedabad', NULL, NULL, 'India', NULL, NULL, NULL, 'DEMOROHAN', NULL, 0, NULL, 1, 0, 1, '2026-06-11 08:25:55'),
  ('c32c768b-7886-4901-9de6-d5c7208f6e6c', 'organization', 'Innov8 Labs Pvt', NULL, 'demo+innov@icenetwork.in', '9800000009', '$2b$10$TlVB6O4vj0opYBqxOgFDy.QcGr9cg64tzo2YiS.WOTy5/YQjEff1m', NULL, NULL, NULL, NULL, NULL, 'Bengaluru', NULL, NULL, 'India', 'Innov8 Labs Pvt', NULL, NULL, 'DEMOINNOV', NULL, 0, NULL, 1, 0, 1, '2026-06-11 08:25:55'),
  ('ab68c458-e145-415d-b83e-8f3892bc30a4', 'organization', 'Venkatesh', 0, 'kamalraj@blackitechs.com', '8056221146', '$2b$12$N/xx3nP6pJkjdiqnI22W0Ol.rfvcBhISUOYf.wJjl1WjZ2c0sGt6K', '', '', '70, Noombal highroad', 'Noombal', 'Iyyapanthangal', 'Chennai', 'Tamil Nadu', '600077', 'India', 'BITS', 'AAXFB4277D', NULL, 'FRXN54LX', '290ee4e0-256d-4bf7-aee7-45de12454280', 0, NULL, 1, 0, 1, '2026-06-03 09:26:12'),
  ('0681dcc0-0887-477f-a8be-b31e4fc63b1c', 'individual', 'Kabir Khan', NULL, 'demo+kabir@icenetwork.in', '9800000005', '$2b$10$TlVB6O4vj0opYBqxOgFDy.QcGr9cg64tzo2YiS.WOTy5/YQjEff1m', NULL, NULL, NULL, NULL, NULL, 'Mumbai', NULL, NULL, 'India', NULL, NULL, NULL, 'DEMOKABIR', '49cb7161-a136-4d1a-a7d7-47a14d5db076', 0, NULL, 1, 0, 1, '2026-06-11 08:25:55'),
  ('10f637e2-d635-4d82-b73d-a3bd39b1f4e1', 'student', 'Shruti Menon', NULL, 'demo+shruti@icenetwork.in', '9800000006', '$2b$10$TlVB6O4vj0opYBqxOgFDy.QcGr9cg64tzo2YiS.WOTy5/YQjEff1m', NULL, NULL, NULL, NULL, NULL, 'Pune', NULL, NULL, 'India', NULL, NULL, NULL, 'DEMOSHRUTI', '49cb7161-a136-4d1a-a7d7-47a14d5db076', 0, NULL, 1, 0, 1, '2026-06-11 08:25:55'),
  ('35f872ae-4887-45f6-9e01-a344df7bc94d', 'individual', 'Meera Pillai', NULL, 'demo+meera@icenetwork.in', '9800000002', '$2b$10$TlVB6O4vj0opYBqxOgFDy.QcGr9cg64tzo2YiS.WOTy5/YQjEff1m', NULL, NULL, NULL, NULL, NULL, 'Kochi', NULL, NULL, 'India', NULL, NULL, NULL, 'DEMOMEERA', '49cb7161-a136-4d1a-a7d7-47a14d5db076', 0, NULL, 1, 0, 1, '2026-06-11 08:25:55'),
  ('87468e32-c513-4ad8-88cb-0e277cc855d0', 'individual', 'Ananya Reddy', NULL, 'demo+ananya@icenetwork.in', '9800000004', '$2b$10$TlVB6O4vj0opYBqxOgFDy.QcGr9cg64tzo2YiS.WOTy5/YQjEff1m', NULL, NULL, NULL, NULL, NULL, 'Vijayawada', NULL, NULL, 'India', NULL, NULL, NULL, 'DEMOANANYA', '49cb7161-a136-4d1a-a7d7-47a14d5db076', 0, NULL, 1, 0, 1, '2026-06-11 08:25:55'),
  ('cb95eb48-8a00-4e68-852d-0baf21a6d02c', 'individual', 'Rahul Verma', NULL, 'demo+rahul@icenetwork.in', '9800000003', '$2b$10$TlVB6O4vj0opYBqxOgFDy.QcGr9cg64tzo2YiS.WOTy5/YQjEff1m', NULL, NULL, NULL, NULL, NULL, 'Hyderabad', NULL, NULL, 'India', NULL, NULL, NULL, 'DEMORAHUL', '49cb7161-a136-4d1a-a7d7-47a14d5db076', 0, NULL, 1, 0, 1, '2026-06-11 08:25:55'),
  ('dbab8add-424a-4b93-b47a-137387547807', 'individual', 'Arjun Iyer', NULL, 'demo+arjun@icenetwork.in', '9800000001', '$2b$10$TlVB6O4vj0opYBqxOgFDy.QcGr9cg64tzo2YiS.WOTy5/YQjEff1m', NULL, NULL, NULL, NULL, NULL, 'Bengaluru', NULL, NULL, 'India', NULL, NULL, NULL, 'DEMOARJUN', '49cb7161-a136-4d1a-a7d7-47a14d5db076', 0, NULL, 1, 0, 1, '2026-06-11 08:25:55');

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- Verification — run after the batch to confirm rows landed.
-- ---------------------------------------------------------------------
SELECT COUNT(*) AS users_total, SUM(referred_by IS NOT NULL) AS referred_rows FROM users;
