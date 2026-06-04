-- Phase 2.2 polish: optional CSR-1 registration number for ICE.
-- When set, surfaces on CSR receipts to substantiate the "registered implementing
-- agency under Section 135" claim. Not required — orgs without CSR-1 still issue
-- receipts; the footer wording softens accordingly.

INSERT INTO `org_settings` (`setting_key`, `setting_type`, `label`, `is_required`) VALUES
    ('ice_csr1_reg_number', 'text', 'CSR-1 registration number (optional)', false);
