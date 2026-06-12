-- Internal-only budget for the event: rooms, AV, ground staff, refreshments etc.
-- Used by admin reports to gauge fundraising efficiency (raised / cost).
-- Not exposed publicly.

ALTER TABLE `events`
    ADD COLUMN `total_cost` DECIMAL(15,2) NULL AFTER `event_location`;
