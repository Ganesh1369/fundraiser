-- CSR Collaboration (Workstream 1): public compliance numbers for the CSR page
-- and the site-wide compliance strip (CSR-1 | 12A | 80G | Section 8).
--
-- `ice_csr1_reg_number` is already read by settingsService.getPublicTrust() but is not
-- seeded anywhere on this branch, so the "CSR-1" line on project landing pages has always
-- resolved to null and silently hidden itself. main seeds it in
-- 20260604120000_phase22_csr1_org_setting; the INSERT IGNORE below makes this migration a
-- no-op for that key once the branches are merged.
--
-- is_required stays false on purpose: these are display-only. Marking them required would
-- make settingsService.assertRequired() throw and block 80G certificate PDF generation
-- until an admin filled them in.

INSERT IGNORE INTO `org_settings` (`setting_key`, `setting_type`, `label`, `is_required`) VALUES
    ('ice_csr1_reg_number',     'text', 'CSR-1 registration number',            false),
    ('ice_12a_reg_number',      'text', '12A registration number',              false),
    ('ice_section8_reg_number', 'text', 'Section 8 registration number / CIN',  false);
