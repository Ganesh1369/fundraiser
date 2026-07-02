-- Phase 3: optional alternate contact (phone) captured on the simplified event registration form.
-- Idempotent (MariaDB `IF NOT EXISTS`) so it is safe even where the column was added manually.
ALTER TABLE `event_registrations`
  ADD COLUMN IF NOT EXISTS `alternate_contact` VARCHAR(255) NULL;
