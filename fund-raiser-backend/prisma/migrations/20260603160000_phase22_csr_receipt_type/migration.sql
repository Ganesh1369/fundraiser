-- Phase 2.2: certificate_requests now stores BOTH 80G certs (existing) and CSR
-- donation receipts (new). The `type` column distinguishes them; downstream
-- generation + admin views branch on it. A single donation is either 80G or
-- CSR (its purpose decides), so the existing UNIQUE(donation_id) still holds.

ALTER TABLE `certificate_requests`
    ADD COLUMN `type` ENUM('80g','csr_receipt') NOT NULL DEFAULT '80g' AFTER `donation_id`;

CREATE INDEX `idx_certificate_requests_type` ON `certificate_requests` (`type`);
