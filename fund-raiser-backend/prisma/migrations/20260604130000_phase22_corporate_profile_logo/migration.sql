-- Phase 2.2 polish: corporate brand logo for co-branding.
-- When a corporate donor uploads a logo, it surfaces on the project landing
-- co-branding strip and on the corporate dashboard. Optional — sponsors
-- without a logo fall back to their organization_name text.

ALTER TABLE `corporate_profiles`
    ADD COLUMN `logo_url` VARCHAR(500) NULL AFTER `industry`;
