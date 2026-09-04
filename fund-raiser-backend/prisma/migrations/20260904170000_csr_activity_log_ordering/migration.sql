-- The activity log is an audit trail, so its order has to be exact.
--
-- `created_at` is second-precision DATETIME, and the module writes several entries within
-- one second routinely (a status change also touching amounts, say). Ordering by it alone
-- returns those in arbitrary order, which showed up as an audit timeline listing an older
-- change above a newer one.
--
-- A monotonic sequence gives a total order that no timestamp collision can disturb.
-- MySQL requires an AUTO_INCREMENT column to be a key; a UNIQUE index satisfies that
-- without displacing the UUID primary key.

ALTER TABLE `csr_enquiry_activity_log`
    ADD COLUMN `seq` BIGINT NOT NULL AUTO_INCREMENT,
    ADD UNIQUE INDEX `idx_csr_log_seq` (`seq`);
