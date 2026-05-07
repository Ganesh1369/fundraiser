-- Phase 2.1 Day 6: enrollment tracking — which event first brought a user in.
-- - enrolled_via_event_id: nullable FK to events. NULL means "not enrolled via event"
--   (e.g. signed up directly).
-- - Backfill from the earliest event_registrations row per user (best-effort; for
--   users who registered via multiple events, we attribute the first chronologically).
-- - Code path in event.service.registerForEvent will set this on first event signup
--   for any user whose value is still NULL.

ALTER TABLE `users`
    ADD COLUMN `enrolled_via_event_id` CHAR(36) NULL;

ALTER TABLE `users`
    ADD CONSTRAINT `fk_users_enrolled_via`
    FOREIGN KEY (`enrolled_via_event_id`) REFERENCES `events`(`id`)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX `idx_users_enrolled_via` ON `users`(`enrolled_via_event_id`);

-- Backfill: earliest event registration per user
UPDATE `users` u
JOIN (
    SELECT er1.user_id, er1.event_id
    FROM `event_registrations` er1
    INNER JOIN (
        SELECT user_id, MIN(created_at) AS first_registration
        FROM `event_registrations`
        GROUP BY user_id
    ) earliest
      ON earliest.user_id = er1.user_id
     AND earliest.first_registration = er1.created_at
) first_reg ON first_reg.user_id = u.id
SET u.`enrolled_via_event_id` = first_reg.event_id
WHERE u.`enrolled_via_event_id` IS NULL;
