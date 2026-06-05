-- =====================================================================
-- Clean up 80G certificate requests created with PAN='PENDING'
-- Target: u378384838_icefdb (Hostinger prod)
-- Run in: phpMyAdmin → SQL tab → paste → Go
--
-- Context: before the donation.service.js hard-gate on PAN, donations with
-- request_80g=true created a certificate_requests row even when the user
-- had no PAN on file — falling back to the literal string 'PENDING'.
-- Those rows are legally invalid and clutter the donor dashboard with a
-- permanent "80G pending" badge.
--
-- This script:
--   1. Deletes any cert request whose pan_number is literal 'PENDING'.
--   2. Clears request_80g on any donation that no longer has a cert request,
--      so the dashboard stops showing the "80G pending" badge for it.
-- =====================================================================

-- 1. Show what's about to be deleted (for the audit log).
SELECT id, user_id, donation_id, pan_number, status, created_at
FROM certificate_requests
WHERE pan_number = 'PENDING';

-- 2. Delete the junk rows.
DELETE FROM certificate_requests WHERE pan_number = 'PENDING';

-- 3. Clear the donation flag on donations whose cert was just removed.
UPDATE donations d
LEFT JOIN certificate_requests c ON c.donation_id = d.id
SET d.request_80g = false
WHERE d.request_80g = true AND c.id IS NULL;

-- 4. Verification — both should return 0.
SELECT 'cert_requests with PENDING pan' AS check_name, COUNT(*) AS remaining
FROM certificate_requests WHERE pan_number = 'PENDING'
UNION ALL
SELECT 'donations with request_80g but no cert', COUNT(*)
FROM donations d
LEFT JOIN certificate_requests c ON c.donation_id = d.id
WHERE d.request_80g = true AND c.id IS NULL;
