/**
 * export-users-to-prod.js
 *
 * Reads every row from local `users` and writes a paste-able SQL file to
 * `scripts/export-users-to-prod.sql` for execution on prod via phpMyAdmin
 * (or `mysql -u ... < file.sql`).
 *
 * Properties of the output:
 *  - INSERT IGNORE so re-runs are safe (duplicate email / referral_code rows skip).
 *  - FOREIGN_KEY_CHECKS=0 around the batch so the self-referencing `referred_by`
 *    FK doesn't blow up regardless of insertion order.
 *  - Carries password_hash, PAN, phone, addresses — i.e. real login + full user
 *    profile. Make sure prod is the intended target before pasting.
 *  - Skips email_verified flag preservation? No — preserved as-is.
 *
 * Excluded for safety / size:
 *  - donations, certificate_requests, referral_points_history, event_registrations,
 *    push_subscriptions — this script is users-only by design.
 *  - admin users live in a separate table (`admins`); not touched.
 *
 * Run: `node scripts/export-users-to-prod.js`
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const OUT_PATH = path.join(__dirname, 'export-users-to-prod.sql');

// ---------------------------------------------------------------------------
// MySQL literal escaping. mysql2 has a static `escape()` but the pool object
// doesn't expose it directly; require the base module instead.
// ---------------------------------------------------------------------------
const mysql = require('mysql2');
const lit = (v) => mysql.escape(v);

// ---------------------------------------------------------------------------
// Columns we export. Schema-exact order from 0_init/migration.sql.
// Excluded: updated_at (let prod write it on insert).
// ---------------------------------------------------------------------------
const COLUMNS = [
    'id', 'user_type', 'name', 'age', 'email', 'phone', 'password_hash',
    'class_grade', 'school_name',
    'address_line_1', 'address_line_2', 'area', 'city', 'state', 'pincode', 'country',
    'organization_name', 'pan_number', 'pan_document_url',
    'referral_code', 'referred_by', 'referral_points', 'profile_pic',
    'email_verified', 'registration_fee_paid', 'is_active', 'created_at',
];

(async () => {
    try {
        const { rows: users } = await db.query(
            `SELECT ${COLUMNS.map(c => `\`${c}\``).join(', ')}
             FROM users
             ORDER BY (referred_by IS NULL) DESC, created_at ASC`
        );

        if (!users.length) {
            console.log('No users in local DB — nothing to export.');
            process.exit(0);
        }

        const lines = [];
        lines.push('-- =====================================================================');
        lines.push('-- Export: local `users` → prod (phpMyAdmin paste-and-run)');
        lines.push(`-- Generated: ${new Date().toISOString()}`);
        lines.push(`-- Rows: ${users.length}`);
        lines.push('--');
        lines.push('-- WHAT THIS DOES:');
        lines.push('--   INSERT IGNORE into `users` — preserves ids, password_hash, PAN,');
        lines.push('--   phone, addresses, referral graph. Duplicates (by email or');
        lines.push('--   referral_code) are silently skipped, so rerunning is safe.');
        lines.push('--');
        lines.push('-- SAFETY:');
        lines.push('--   - FOREIGN_KEY_CHECKS=0 around the batch so the self-ref');
        lines.push('--     `referred_by` FK never blocks an insert.');
        lines.push('--   - Does NOT touch donations, certs, referral_points_history,');
        lines.push('--     event_registrations, push_subscriptions, or admins.');
        lines.push('--');
        lines.push('-- BEFORE RUNNING:');
        lines.push('--   1. Take a fresh prod DB backup (phpMyAdmin → Export → SQL).');
        lines.push('--   2. Verify the row count below matches what you intend to push.');
        lines.push('--   3. Confirm none of these emails should be a NEW prod signup —');
        lines.push('--      a real user signing up with the same email AFTER this paste');
        lines.push('--      will hit `Duplicate entry` and fail at registration.');
        lines.push('-- =====================================================================');
        lines.push('');
        lines.push('SET FOREIGN_KEY_CHECKS = 0;');
        lines.push('');

        // Batch in groups of 50 to keep individual INSERTs digestible in phpMyAdmin.
        const BATCH = 50;
        const colList = COLUMNS.map(c => `\`${c}\``).join(', ');

        for (let i = 0; i < users.length; i += BATCH) {
            const chunk = users.slice(i, i + BATCH);
            const valueLists = chunk.map(u => {
                const vals = COLUMNS.map(c => {
                    const v = u[c];
                    if (v === null || v === undefined) return 'NULL';
                    if (v instanceof Date)              return lit(toMysqlDate(v));
                    if (typeof v === 'boolean')         return v ? '1' : '0';
                    return lit(v);
                });
                return `  (${vals.join(', ')})`;
            }).join(',\n');

            lines.push(`-- Batch ${Math.floor(i / BATCH) + 1} — ${chunk.length} row(s)`);
            lines.push(`INSERT IGNORE INTO \`users\` (${colList}) VALUES`);
            lines.push(valueLists + ';');
            lines.push('');
        }

        lines.push('SET FOREIGN_KEY_CHECKS = 1;');
        lines.push('');
        lines.push('-- ---------------------------------------------------------------------');
        lines.push('-- Verification — run after the batch to confirm rows landed.');
        lines.push('-- ---------------------------------------------------------------------');
        lines.push(`SELECT COUNT(*) AS users_total, SUM(referred_by IS NOT NULL) AS referred_rows FROM users;`);
        lines.push('');

        fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');
        console.log(`Wrote ${users.length} users → ${OUT_PATH}`);
        console.log(`File size: ${(fs.statSync(OUT_PATH).size / 1024).toFixed(1)} KB`);
        process.exit(0);
    } catch (err) {
        console.error('EXPORT FAILED', err);
        process.exit(1);
    }
})();

/** Convert a JS Date to MySQL DATETIME literal in UTC (no TZ shift surprises). */
function toMysqlDate(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
