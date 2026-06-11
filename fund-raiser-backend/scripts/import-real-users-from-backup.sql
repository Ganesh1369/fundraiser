-- =====================================================================
-- Import: real users extracted from prod backup (u378384838_icefdb.sql)
-- Generated: 2026-06-11T08:40:43Z
-- Source rows: 14 (all rows from the backup users table)
--
-- WHAT THIS DOES:
--   INSERT IGNORE into `users` — preserves ids, password_hash, PAN,
--   phone, addresses, referral graph. Duplicates skip silently.
--
-- SAFETY:
--   - FOREIGN_KEY_CHECKS=0 around the batch so the self-ref
--     `referred_by` FK never blocks an insert.
--   - Does NOT touch donations, certs, otp, leaderboard.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

INSERT IGNORE INTO `users` (`id`, `user_type`, `name`, `age`, `email`, `phone`, `password_hash`, `class_grade`, `school_name`, `address_line_1`, `address_line_2`, `area`, `city`, `state`, `pincode`, `country`, `organization_name`, `pan_number`, `pan_document_url`, `referral_code`, `referred_by`, `referral_points`, `profile_pic`, `email_verified`, `registration_fee_paid`, `is_active`, `created_at`, `updated_at`) VALUES
('1e7414f3-b18d-436a-9c9a-7e8eb380e672', 'individual', 'Mirunalini', NULL, 'miruvenki@gmail.com', '9944483368', '$2b$16$fsgi37wqNXaK0wZI0WCQK.nlF3E2E28MWC5wAs6iwGpjsZVZSNdvW', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'India', NULL, NULL, NULL, 'FR5IN6O5', NULL, 0, NULL, 1, 0, 1, '2026-06-02 11:43:33', '2026-06-02 11:43:33'),
('3815264b-4893-428e-9f63-b1c02aaadcf0', 'individual', 'Gautam Reddy', 0, 'b.v.gautam@gmail.com', '9840888164', '$2b$16$0uyARdKYnT1L3gawK/ZDPuRzNcgQ1IZEPSJRlTX/Vwz/LCN6qmNsy', '', '', '3, 4th Ave, Harrington Rd, Chetpet', '', 'Chetpet', 'Chennai', 'Tamil Nadu', '600031', 'India', '', '', NULL, 'FRZ4NQ9J', NULL, 0, NULL, 1, 0, 1, '2026-02-26 03:37:11', '2026-05-27 14:20:09'),
('42878e7e-e566-48a4-a53d-fb711bbf4988', 'individual', 'Radhika Ramesh', 0, 'csradhikaramesh@gmail.com', '9952028621', '$2b$16$nrpLqzxs13R/Wm1FBXnT6eRwPpUEajHx5BccaZI2kIe69RZNMdwES', '', '', 'Old No.25 Chennai - 600024', '', 'Nungambakkam', 'Chennai', 'Tamil Nadu', '600024', 'India', '', '', NULL, 'FRXU57W5', NULL, 2000, NULL, 1, 1, 1, '2026-02-19 09:39:02', '2026-03-04 13:21:45'),
('48577226-625c-4995-936f-120d00c84f6c', 'individual', 'Sharmila', NULL, 'sharmilagopalan14@gmail.com', '7358254364', '$2b$16$HeF76Sf3OOJhxKWa7yJJhOu18RPsrNI3eQnXbKluhWP.NUupmetga', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'India', NULL, NULL, NULL, 'FRWV0TDX', NULL, 0, NULL, 1, 0, 1, '2026-02-19 10:37:58', '2026-02-19 10:37:58'),
('512f98d5-0111-48d1-a8ff-8a573b3851a8', 'organization', 'Lamakjar', 0, 'kamalraj@blackitechs.com', '8056222246', '$2b$16$.Qd/jz4clY2LXaotBeZje.6vP1r8doWfw3GfKyrxnrda1MYgoFmLi', '', '', '6, Agatheeswarar Kovil Street', 'Kamarajar Highroad', 'Old Perungalathur', 'Chennai', 'Tamil Nadu', '600063', 'India', 'Black I Technologies and Solutions', 'JJGPK1635F', NULL, 'FRMSH8F1', NULL, 0, NULL, 1, 0, 1, '2026-03-09 13:02:03', '2026-03-09 13:02:58'),
('5782e978-a6e9-45ec-ac6c-997b28b01eaf', 'individual', 'Nikhil', 0, 'nikhil_raj@hotmail.com', '9940641168', '$2b$16$qrtGdhByyx57uDYUGaVsHubbXd20SVJRWPhpz1f6tw8oAjKcJ2fl6', '', '', '153 mount road', '', 'Chennai', 'Chennai', 'Tamil Nadu', '600002', 'India', '', '', NULL, 'FR4T177W', NULL, 0, NULL, 1, 0, 1, '2026-03-01 10:09:42', '2026-03-01 10:10:38'),
('686e13b8-f4dc-4ca6-88c6-4ba6e88a51a7', 'individual', 'Lamakjar', NULL, 'treasuryracmc2024@gmail.com', '9003256425', '$2b$16$yK14IFtXuoKwq0e3jE2pWOcdDgJDaqF392upuIK8jemzG9J1t0NBq', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'India', NULL, NULL, NULL, 'FRLOZ009', NULL, 0, NULL, 1, 0, 1, '2026-02-18 11:17:54', '2026-02-18 11:17:54'),
('6a5c36f7-d46f-473f-8a56-353ebb1b0e38', 'individual', 'Sabrina Rajan ', 0, 'sabrinarajan26@gmail.com', '98404 71333', '$2b$16$5qpyk5L5sNSWzRH1I/Vup.vCIupP0LSQxizZC0dJoNeZBWmP8QJjy', '', '', 'F151, 8th st, F block', 'Anna Nagar East ', 'Anna Nagar East ', 'Chennai', 'Tatatatata', '600102', 'India', '', '', NULL, 'FRXCKBYY', NULL, 0, NULL, 1, 0, 1, '2026-02-19 15:30:37', '2026-02-19 15:34:06'),
('8174b620-3885-4e23-b3a5-97f726a343b4', 'individual', 'Kamalraj Ganesan ', 0, 'kamalrajganesan2000@gmail.com', '8056221146', '$2b$16$HOlK.v78Wck0LwA/JF6lmuaUcY8L84lnzZsOEnx5Q7bBwQMEu/tdW', '', '', 'Agatheewarar kovil street', 'Kamarajar highroad', 'Old Perungalathur', 'Chennai', 'Tamil Nadu', '600063', 'India', '', '', NULL, 'FR17A80P', NULL, 0, NULL, 1, 1, 1, '2026-02-14 10:28:16', '2026-02-24 23:58:17'),
('aed9f54e-9401-41f8-bf4d-91edf5c22271', 'individual', 'AKSHAYA KUMAR PRADHAN', 0, 'akshayakumar.pradhan@gmail.com', '09952029075', '$2b$16$J9/0igwjEGLmrj.koPHBTuLOjr5N5oMzh7AEDAxqP712XQ.WYrMEi', '', '', 'Peace Apartment, F2 1st Floor, Bajanai Koil 1st Street Choolaimedu', 'Peace Apartment, F2 1st Floor, Bajanai Koil 1st Street', 'Choolaimedu', 'Chennai', 'Tamil Nadu', '600094', 'India', '', '', NULL, 'FRQ0LU8U', '42878e7e-e566-48a4-a53d-fb711bbf4988', 0, NULL, 1, 0, 1, '2026-03-04 13:19:21', '2026-03-04 13:20:18'),
('b3d06723-8a54-4afe-8b3e-192092d066c6', 'individual', 'Laura Raj', 0, 'lauraraj1967@gmail.com', '+91 98411 07251', '$2b$16$tVinHCsdotj7TqFxEFKZ4eQx24KY8SKgUtJ1r6samjypsQ67gEHoS', '', '', '48 north Boag road', 'T  nagar', 'Chennai', 'Chennai', 'Tamil Nadu', '600017', 'India', '', '', NULL, 'FRCJGPL3', NULL, 0, NULL, 1, 0, 1, '2026-03-01 10:09:45', '2026-03-01 10:11:00'),
('d7be1685-c718-4884-9cf0-1af331f60423', 'organization', 'Ganesh S', NULL, 'blackitechs@gmail.com', '7338908955', '$2b$16$41s8Y/Qx7gm0aLke2JgJ3uHd/nFTSp6HBjeNtCVzOXoBOLU/d9J0m', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'India', 'Black I Technologies and Solutions', 'JJPGH6572D', NULL, 'FRTK2PNG', '8174b620-3885-4e23-b3a5-97f726a343b4', 0, NULL, 1, 1, 1, '2026-02-14 10:31:21', '2026-02-14 10:31:53'),
('dafabaea-dae0-4fed-be24-0a22115b496e', 'organization', 'Venkatesh A', NULL, 'lamaktrades@gmail.com', '8090809089', '$2b$16$2TpVtT.6J7n6vgO0rriJk.2k4JJyexkDem9yqaeOF.f8fZ9m9ss/6', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'India', 'Alphabet Inc.', 'JJGPG1634H', NULL, 'FRE0Y9ZB', NULL, 0, NULL, 1, 0, 1, '2026-02-19 10:30:53', '2026-02-19 10:30:53'),
('e2ff2a39-2863-4954-989b-862601088c09', 'individual', 'Prasanna Ravichandran', NULL, 'prasanna000777@gmail.com', '8489673284', '$2b$16$vxrsZgDSMSMChipfD.see.Vv/CT5Wd.a3v2G92VD1hnap2EWcArqi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'India', NULL, NULL, NULL, 'FRVPYML8', NULL, 0, NULL, 1, 0, 1, '2026-03-04 12:53:20', '2026-03-04 12:53:20');

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------
SELECT COUNT(*) AS users_total, SUM(referred_by IS NOT NULL) AS referred_rows FROM users;
