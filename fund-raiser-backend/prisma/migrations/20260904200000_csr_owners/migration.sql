-- CSR enquiry owners as their own records, rather than admin login accounts.
--
-- "Owner" answers "who at ICE is handling this partnership" — a person who receives the
-- assignment and status emails. That is not the same question as "who can sign into the
-- admin panel", and tying the two together meant a new owner could only be added by
-- creating a login account with a password, from a dropdown. This separates them: owners
-- are a name and an email, added inline while assigning.

CREATE TABLE `csr_owners` (
    `id`         CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `name`       VARCHAR(150) NOT NULL,
    -- Unique so the same person cannot be added twice under slightly different names.
    `email`      VARCHAR(255) NOT NULL UNIQUE,
    `is_active`  BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_csr_owners_active` ON `csr_owners` (`is_active`, `name`);

-- Carry across every admin who currently owns an enquiry, so no assignment is lost.
INSERT INTO `csr_owners` (`name`, `email`)
SELECT DISTINCT COALESCE(a.name, a.username), a.email
FROM `admin_users` a
JOIN `csr_enquiries` e ON e.owner_admin_id = a.id
WHERE a.email IS NOT NULL AND a.email <> '';

ALTER TABLE `csr_enquiries`
    ADD COLUMN `owner_id` CHAR(36) NULL AFTER `owner_admin_id`,
    ADD CONSTRAINT `csr_enquiries_owner_ref_fk` FOREIGN KEY (`owner_id`)
        REFERENCES `csr_owners` (`id`) ON DELETE SET NULL;

-- Point existing enquiries at their migrated owner record.
UPDATE `csr_enquiries` e
JOIN `admin_users` a ON a.id = e.owner_admin_id
JOIN `csr_owners` o ON o.email = a.email
SET e.owner_id = o.id;

-- The old link to a login account is replaced, not kept alongside — two owner columns
-- would drift apart the first time someone wrote to only one of them.
ALTER TABLE `csr_enquiries` DROP FOREIGN KEY `csr_enquiries_owner_fk`;
ALTER TABLE `csr_enquiries` DROP COLUMN `owner_admin_id`;

CREATE INDEX `idx_csr_enquiries_owner_ref` ON `csr_enquiries` (`owner_id`);
