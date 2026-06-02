-- Phase 2.2: free-form event_type
-- Convert events.event_type from ENUM('marathon','cyclothon','walkathon') to VARCHAR(50).
-- Existing values are already lowercase slugs and remain valid.

ALTER TABLE `events`
    MODIFY COLUMN `event_type` VARCHAR(50) NOT NULL;
