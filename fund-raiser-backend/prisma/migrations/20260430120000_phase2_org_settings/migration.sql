-- Phase 2.1: org_settings — admin-editable ICE org details consumed by the cert PDF generator.
-- Hand-written migration (because Prisma CLI was not available at authoring time).
-- Matches the OrgSetting model in schema.prisma.

-- CreateTable: org_settings
CREATE TABLE `org_settings` (
    `setting_key` VARCHAR(100) NOT NULL,
    `setting_value` TEXT NULL,
    `setting_type` ENUM('text', 'image', 'date', 'number') NOT NULL DEFAULT 'text',
    `label` VARCHAR(150) NULL,
    `is_required` BOOLEAN NOT NULL DEFAULT false,
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
    `updated_by` CHAR(36) NULL,

    PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed required keys with empty values. Admin fills them in via the Organization page.
INSERT INTO `org_settings` (`setting_key`, `setting_type`, `label`, `is_required`) VALUES
    ('ice_legal_name',         'text',  'ICE legal name (as registered)',  true),
    ('ice_registered_address', 'text',  'ICE registered address',          true),
    ('ice_pan',                'text',  'ICE PAN',                         true),
    ('ice_80g_reg_number',     'text',  '80G registration number',         true),
    ('ice_80g_valid_from',     'date',  '80G validity — from',             true),
    ('ice_80g_valid_to',       'date',  '80G validity — to',               true),
    ('ice_signatory_name',     'text',  'Signatory name & designation',    true),
    ('ice_signatory_image',    'image', 'Signatory signature image',       true),
    ('ice_logo',               'image', 'ICE logo (used on certificate)',  true);
