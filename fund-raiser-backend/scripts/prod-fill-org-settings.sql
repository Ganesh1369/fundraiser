-- =====================================================================
-- Fill required org_settings — unblocks 80G cert PDF generation.
-- Target: u378384838_icefdb (Hostinger prod)
-- Run in: phpMyAdmin → SQL tab → paste, EDIT THE TODO VALUES, → Go.
--
-- All 9 keys are marked is_required in the seed. settingsService.assertRequired()
-- throws "Org settings incomplete: <missing keys>" while any required value is
-- empty/null, and the cert generator silently bails with that error written to
-- last_generation_error. Fill these → click Regenerate on the pending cert →
-- PDF + email flow.
--
-- After running this script:
--   1. Admin Settings page should show all rows filled (visual confirmation).
--   2. Admin Certificates page → find the pending cert → Regenerate.
--   3. Dashboard donation badge flips pending → approved within ~2s.
-- =====================================================================

-- ---------------------------------------------------------------------
-- TEXT FIELDS — replace each VALUE below with your real org details.
-- ---------------------------------------------------------------------

UPDATE org_settings SET setting_value = 'Institute for Climate and Environment'
WHERE setting_key = 'ice_legal_name';
-- TODO: confirm the exact legal name as registered with the IT department.

UPDATE org_settings SET setting_value = 'TODO: full registered address, single line'
WHERE setting_key = 'ice_registered_address';
-- e.g. 'No. 12, Avenue Road, Chennai, Tamil Nadu, 600028, India'

UPDATE org_settings SET setting_value = 'TODO_PAN'
WHERE setting_key = 'ice_pan';
-- 10 chars, format AAAAA1234A (5 letters, 4 digits, 1 letter).

UPDATE org_settings SET setting_value = 'TODO/80G/REG/NUMBER'
WHERE setting_key = 'ice_80g_reg_number';
-- Your 80G registration number issued by the IT Dept.

UPDATE org_settings SET setting_value = '2024-04-01'
WHERE setting_key = 'ice_80g_valid_from';
-- ISO date YYYY-MM-DD. Replace with the date on your 80G certificate.

UPDATE org_settings SET setting_value = '2029-03-31'
WHERE setting_key = 'ice_80g_valid_to';
-- ISO date YYYY-MM-DD. 5-year placeholder; replace with the actual expiry.

UPDATE org_settings SET setting_value = 'TODO: Signatory Full Name, Designation'
WHERE setting_key = 'ice_signatory_name';
-- e.g. 'Jane Doe, Director'

-- ---------------------------------------------------------------------
-- IMAGE FIELDS — these need a real uploaded asset path.
-- RECOMMENDED: use the admin Settings page (logged-in admin → Settings →
-- "Upload signature" / "Upload logo") instead of SQL. The upload UI saves
-- the file under /uploads/org/ AND writes the path into org_settings in
-- one step.
--
-- If you must set them via SQL right now (e.g. for testing), upload the
-- file to /home/u378384838/domains/backend.icenetwork.in/nodejs/uploads/org/
-- manually first, then UPDATE the row with the matching URL path. Example:
-- UPDATE org_settings SET setting_value = '/uploads/org/signature-1717600000000.png'
-- WHERE setting_key = 'ice_signatory_image';
-- UPDATE org_settings SET setting_value = '/uploads/org/logo-1717600000000.png'
-- WHERE setting_key = 'ice_logo';
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- Verification — every row's setting_value should be non-null/non-empty.
-- ---------------------------------------------------------------------
SELECT setting_key,
       CASE
           WHEN setting_value IS NULL OR setting_value = '' THEN '✘ EMPTY'
           WHEN setting_value LIKE 'TODO%' OR setting_value LIKE '%TODO%'  THEN '✘ TODO PLACEHOLDER'
           ELSE '✓ filled'
       END AS status,
       LEFT(setting_value, 50) AS preview
FROM org_settings
WHERE is_required = true
ORDER BY setting_key;
