-- Phase 2.1 Day 5: referral-formula cutover.
-- Locked decision PHASE-2-PLAN.md §5/§14 (2026-04-30):
--   v1 = legacy, ₹1 = 1 point. Frozen for pre-cutover donations.
--   v2 = new,    ₹100 = 1 point. Default for all rows from cutover onward.
--
-- The donations.points_formula_version column was added with DEFAULT 2 in
-- 20260505130100_phase2_donations_link, so all existing rows currently have v=2.
-- This backfill flips every row created BEFORE this migration's apply moment to v=1,
-- locking historical points calculation to the legacy formula.
--
-- Cutover boundary = the moment this migration runs on prod (`prisma migrate deploy`).
-- The IST timestamp is captured in `_prisma_migrations.finished_at` for audit.
-- Any donation row created strictly after this migration's apply time keeps v=2 and
-- earns points at the new ₹100 = 1 point rate.
--
-- Rationale for using NOW() instead of a hardcoded literal: the file is committed
-- in advance of deploy, and `_prisma_migrations.finished_at` already records the
-- exact apply timestamp — there is no scenario where a hardcoded literal would be
-- more auditable than the migration metadata.

UPDATE `donations`
SET    `points_formula_version` = 1
WHERE  `created_at` < NOW();
