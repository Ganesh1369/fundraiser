/**
 * seed-demo-loyalty.js
 *
 * Seeds the local DB with a believable demo dataset for the project page
 * trust strip, live donor ticker, admin top-donors, top-referrers and the
 * dashboard referral block.
 *
 * Idempotent: deletes anything previously seeded by this script
 * (matched via email LIKE 'demo+%@icenetwork.in') and re-inserts.
 *
 * Run: `node scripts/seed-demo-loyalty.js`
 * Password for every seeded user: Demo@123
 *
 * Top referrer: demo+priya@icenetwork.in
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db = require('../src/config/db');

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const PASSWORD = 'Demo@123';

const DONORS = [
    // Marquee referrer — owns the highest points + a feed-rich donation log.
    { key: 'priya',   name: 'Priya Sharma',     city: 'Chennai',    type: 'individual',   isReferrer: true,  refKey: null },
    // Referred via Priya — together they make the referral leaderboard pop.
    { key: 'arjun',   name: 'Arjun Iyer',       city: 'Bengaluru',  type: 'individual',   isReferrer: false, refKey: 'priya' },
    { key: 'meera',   name: 'Meera Pillai',     city: 'Kochi',      type: 'individual',   isReferrer: false, refKey: 'priya' },
    { key: 'rahul',   name: 'Rahul Verma',      city: 'Hyderabad',  type: 'individual',   isReferrer: false, refKey: 'priya' },
    { key: 'ananya',  name: 'Ananya Reddy',     city: 'Vijayawada', type: 'individual',   isReferrer: false, refKey: 'priya' },
    { key: 'kabir',   name: 'Kabir Khan',       city: 'Mumbai',     type: 'individual',   isReferrer: false, refKey: 'priya' },
    { key: 'shruti',  name: 'Shruti Menon',     city: 'Pune',       type: 'student',      isReferrer: false, refKey: 'priya' },
    // Unreferred — keep the donor pool diverse.
    { key: 'rohan',   name: 'Rohan Desai',      city: 'Ahmedabad',  type: 'individual',   isReferrer: false, refKey: null },
    { key: 'divya',   name: 'Divya Krishnan',   city: 'Coimbatore', type: 'student',      isReferrer: false, refKey: null },
    { key: 'innov',   name: 'Innov8 Labs Pvt',  city: 'Bengaluru',  type: 'organization', isReferrer: false, refKey: null },
];

// Donations as relative offsets in days from today (negative = in the past).
// Distribution favours the last 30 days so the donor ticker has fresh entries.
const DONATIONS = [
    // Priya (5) — strong donor + referrer
    { donor: 'priya',  amount: 2500, daysAgo: 58, projectSlug: 'roots', request80g: true  },
    { donor: 'priya',  amount: 1000, daysAgo: 42, projectSlug: 'roots', request80g: false },
    { donor: 'priya',  amount: 5000, daysAgo: 21, projectSlug: 'roots', request80g: true  },
    { donor: 'priya',  amount: 500,  daysAgo: 9,  projectSlug: 'roots', request80g: false },
    { donor: 'priya',  amount: 1500, daysAgo: 2,  projectSlug: 'roots', request80g: true  },

    // Arjun (3)
    { donor: 'arjun',  amount: 1000, daysAgo: 36, projectSlug: 'roots', request80g: false },
    { donor: 'arjun',  amount: 2500, daysAgo: 16, projectSlug: 'roots', request80g: true  },
    { donor: 'arjun',  amount: 500,  daysAgo: 4,  projectSlug: 'roots', request80g: false },

    // Meera (3)
    { donor: 'meera',  amount: 500,  daysAgo: 30, projectSlug: 'roots', request80g: false },
    { donor: 'meera',  amount: 1000, daysAgo: 12, projectSlug: 'roots', request80g: false },
    { donor: 'meera',  amount: 250,  daysAgo: 1,  projectSlug: 'roots', request80g: false },

    // Rahul (3)
    { donor: 'rahul',  amount: 2500, daysAgo: 28, projectSlug: 'roots', request80g: true  },
    { donor: 'rahul',  amount: 500,  daysAgo: 14, projectSlug: 'roots', request80g: false },
    { donor: 'rahul',  amount: 1500, daysAgo: 6,  projectSlug: 'roots', request80g: true  },

    // Ananya (2)
    { donor: 'ananya', amount: 1000, daysAgo: 22, projectSlug: 'roots', request80g: false },
    { donor: 'ananya', amount: 500,  daysAgo: 3,  projectSlug: 'roots', request80g: false },

    // Kabir (3)
    { donor: 'kabir',  amount: 5000, daysAgo: 26, projectSlug: 'roots', request80g: true  },
    { donor: 'kabir',  amount: 2500, daysAgo: 11, projectSlug: 'roots', request80g: true  },
    { donor: 'kabir',  amount: 500,  daysAgo: 0,  projectSlug: 'roots', request80g: false },

    // Shruti (2)
    { donor: 'shruti', amount: 250,  daysAgo: 19, projectSlug: 'roots', request80g: false },
    { donor: 'shruti', amount: 500,  daysAgo: 5,  projectSlug: 'roots', request80g: false },

    // Rohan (3 — unreferred)
    { donor: 'rohan',  amount: 2500, daysAgo: 33, projectSlug: 'roots', request80g: true  },
    { donor: 'rohan',  amount: 1000, daysAgo: 17, projectSlug: 'roots', request80g: false },
    { donor: 'rohan',  amount: 500,  daysAgo: 7,  projectSlug: 'roots', request80g: false },

    // Divya (2 — unreferred, student small ticket)
    { donor: 'divya',  amount: 250,  daysAgo: 24, projectSlug: 'roots', request80g: false },
    { donor: 'divya',  amount: 500,  daysAgo: 8,  projectSlug: 'roots', request80g: false },

    // Innov8 Labs (2 — corporate)
    { donor: 'innov',  amount: 10000, daysAgo: 31, projectSlug: 'roots', request80g: true },
    { donor: 'innov',  amount: 5000,  daysAgo: 10, projectSlug: 'roots', request80g: true },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emailFor(key)        { return `demo+${key}@icenetwork.in`; }
function phoneFor(idx)        { return `9${(800000000 + idx).toString().padStart(9, '0')}`; }
function referralCodeFor(key) { return `DEMO${key.toUpperCase().slice(0, 6)}`; }
function pointsFor(amount)    { return Math.floor(amount / 100); } // v2 formula — ₹100=1pt

function offsetDate(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 19).replace('T', ' ');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
    let stats = { usersDeleted: 0, donationsDeleted: 0, usersInserted: 0, donationsInserted: 0, pointsRows: 0 };
    try {
        console.log('--- seed-demo-loyalty ---');

        // 1. Resolve project IDs.
        const { rows: projects } = await db.query(
            `SELECT id, slug, name FROM projects WHERE slug IN ('roots','zoo')`
        );
        if (!projects.length) {
            console.error('No ROOTS or ZOO project found. Run the project seed migrations first.');
            process.exit(1);
        }
        const projectBySlug = Object.fromEntries(projects.map(p => [p.slug, p]));
        console.log(`Found ${projects.length} project(s): ${projects.map(p => p.slug).join(', ')}`);

        // 2. Clean up any previous demo data (cascade order respects FKs).
        const { rows: existing } = await db.query(
            `SELECT id FROM users WHERE email LIKE 'demo+%@icenetwork.in'`
        );
        if (existing.length) {
            const ids = existing.map(u => u.id);
            const placeholders = ids.map(() => '?').join(',');
            const d1 = await db.query(
                `DELETE FROM referral_points_history WHERE user_id IN (${placeholders})`, ids
            );
            await db.query(
                `DELETE FROM referral_points_history WHERE donation_id IN (
                   SELECT id FROM donations WHERE user_id IN (${placeholders})
                 )`, ids
            );
            const d2 = await db.query(
                `DELETE FROM certificate_requests WHERE user_id IN (${placeholders})`, ids
            );
            const d3 = await db.query(
                `DELETE FROM donations WHERE user_id IN (${placeholders})`, ids
            );
            const d4 = await db.query(
                `DELETE FROM users WHERE id IN (${placeholders})`, ids
            );
            stats.usersDeleted = d4.rows.affectedRows ?? d4.rowCount;
            stats.donationsDeleted = d3.rows.affectedRows ?? d3.rowCount;
            console.log(`Wiped ${stats.usersDeleted} prior demo users + ${stats.donationsDeleted} donations.`);
        }

        // 3. Hash the demo password once.
        const passwordHash = await bcrypt.hash(PASSWORD, 10);

        // 4. Insert users. Two-pass so referred_by FK resolves cleanly.
        const userIds = {};
        for (let i = 0; i < DONORS.length; i++) {
            const d = DONORS[i];
            userIds[d.key] = uuid();
        }
        for (let i = 0; i < DONORS.length; i++) {
            const d = DONORS[i];
            const referrerId = d.refKey ? userIds[d.refKey] : null;
            await db.query(
                `INSERT INTO users
                 (id, user_type, name, email, phone, password_hash, city, country,
                  organization_name, referral_code, referred_by, referral_points,
                  email_verified, is_active, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'India', ?, ?, ?, 0, true, true, NOW())`,
                [
                    userIds[d.key], d.type, d.name, emailFor(d.key), phoneFor(i),
                    passwordHash, d.city,
                    d.type === 'organization' ? d.name : null,
                    referralCodeFor(d.key),
                    referrerId,
                ]
            );
            stats.usersInserted++;
        }
        console.log(`Inserted ${stats.usersInserted} demo users.`);

        // 5. Insert donations + referral_points_history rows.
        const pointsByReferrer = {};
        for (const dn of DONATIONS) {
            const donorId = userIds[dn.donor];
            if (!donorId) throw new Error(`Unknown donor key in DONATIONS: ${dn.donor}`);
            const project = projectBySlug[dn.projectSlug] || projectBySlug.roots;
            const donor = DONORS.find(d => d.key === dn.donor);
            const referrerId = donor.refKey ? userIds[donor.refKey] : null;
            const donationId = uuid();
            const createdAt = offsetDate(dn.daysAgo);

            await db.query(
                `INSERT INTO donations
                 (id, user_id, event_id, project_id, amount, currency,
                  status, referrer_id, points_awarded, purpose, request_80g,
                  payment_method, razorpay_order_id, razorpay_payment_id,
                  created_at, updated_at)
                 VALUES (?, ?, NULL, ?, ?, 'INR', 'completed', ?, ?, 'donation', ?, ?, ?, ?, ?, ?)`,
                [
                    donationId, donorId, project.id, dn.amount,
                    referrerId, referrerId ? 1 : 0,
                    dn.request80g ? 1 : 0,
                    'demo_seed',
                    `order_demo_${donationId.slice(0, 8)}`,
                    `pay_demo_${donationId.slice(0, 8)}`,
                    createdAt, createdAt,
                ]
            );
            stats.donationsInserted++;

            if (referrerId) {
                const points = pointsFor(dn.amount);
                await db.query(
                    `INSERT INTO referral_points_history
                     (id, user_id, donation_id, points_earned, donor_name, created_at)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [uuid(), referrerId, donationId, points, donor.name, createdAt]
                );
                stats.pointsRows++;
                pointsByReferrer[referrerId] = (pointsByReferrer[referrerId] || 0) + points;
            }
        }

        // 6. Update users.referral_points totals.
        for (const [referrerId, total] of Object.entries(pointsByReferrer)) {
            await db.query(`UPDATE users SET referral_points = ? WHERE id = ?`, [total, referrerId]);
        }

        // 7. Summary.
        console.log('--- done ---');
        console.log(stats);
        console.log(`Top referrer: demo+priya@icenetwork.in / ${PASSWORD}  (login → /dashboard to see referral block)`);
        process.exit(0);
    } catch (err) {
        console.error('SEED FAILED', err);
        process.exit(1);
    }
})();
