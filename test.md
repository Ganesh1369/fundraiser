# Phase 2.1 — End-to-End Test Workflow

Step-by-step walkthrough that exercises every feature shipped across Days 1–7 (Phase 2.1 through 2.7). Run top to bottom; each step depends on the previous ones.

- **Frontend:** http://localhost:4200
- **Backend:** http://localhost:3000
- **DB:** `fundraiser_db` on `localhost:3306` (XAMPP, user `root`, empty password)

---

## 0. One-time setup

### 0.1 Stack

```powershell
# Terminal 1 — XAMPP MySQL (or start via XAMPP control panel)
C:\xampp\mysql\bin\mysqld.exe --defaults-file=C:\xampp\mysql\bin\my.ini --standalone

# Terminal 2 — backend
cd E:\BITS\github\ICE\fundraiser\fund-raiser-backend
npm run dev

# Terminal 3 — frontend
cd E:\BITS\github\ICE\fundraiser\fund-raiser-frontend
npm start
```

### 0.2 Confirm migrations applied

```powershell
cd E:\BITS\github\ICE\fundraiser\fund-raiser-backend
npx prisma migrate status
```

Should report **9 migrations applied, no pending migrations**. If not, run `npx prisma migrate deploy`.

### 0.3 Seed admin user

```powershell
cd E:\BITS\github\ICE\fundraiser\fund-raiser-backend
node -e "const b=require('bcryptjs');const c=require('./src/config/db');b.hash('admin123',12).then(h=>c.query('INSERT INTO admin_users (username,password_hash,name,email,is_active) VALUES (?,?,?,?,1) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash)',['admin',h,'Admin','admin@local']).then(()=>{console.log('OK');process.exit(0)}))"
```

Login at `/admin/login` with `admin` / `admin123`.

### 0.4 Seed `org_settings` (required for F. 80G)

```sql
UPDATE org_settings SET setting_value='ICE Foundation'               WHERE setting_key='ice_legal_name';
UPDATE org_settings SET setting_value='AAATI1234F'                   WHERE setting_key='ice_pan';
UPDATE org_settings SET setting_value='AAATI1234F2025/80G/001'       WHERE setting_key='ice_80g_reg_number';
UPDATE org_settings SET setting_value='2025-04-01'                   WHERE setting_key='ice_80g_valid_from';
UPDATE org_settings SET setting_value='2030-03-31'                   WHERE setting_key='ice_80g_valid_to';
UPDATE org_settings SET setting_value='123 ICE Lane, Bengaluru, KA'  WHERE setting_key='ice_registered_address';
UPDATE org_settings SET setting_value='K. Rajesh, Treasurer'         WHERE setting_key='ice_signatory_name';
```

(`ice_logo` and `ice_signatory_image` stay NULL — PDF generates without them.)

### 0.5 Seed test event

```sql
SET @roots := (SELECT id FROM projects WHERE slug='roots');
INSERT INTO events (id, project_id, event_name, event_type, event_date, event_location, description,
                    is_active, registration_open, schedule, venue_details,
                    contact_name, contact_phone, contact_email)
VALUES (UUID(), @roots, 'ROOTS Marathon 2026', 'marathon',
        DATE_ADD(CURDATE(), INTERVAL 60 DAY), 'Cubbon Park, Bengaluru',
        'Annual fundraising marathon for tree planting', 1, 1,
        '[{"time":"06:00","title":"Flag-off","description":"5K + 10K starts"},
          {"time":"08:30","title":"Finish","description":"Breakfast"}]',
        'Cubbon Park main entrance. Free parking on Kasturba Rd.',
        'Event Desk', '+91-9876543210', 'events@icenetwork.in');
```

### 0.6 Confirm baseline

```sql
SELECT slug, name, is_active FROM projects;           -- expect: roots, zoo (both active)
SELECT event_name FROM events;                         -- expect: ROOTS Marathon 2026
SELECT username FROM admin_users;                      -- expect: admin
```

---

## 1. Projects baseline (Day 1–2, plan §2)

| # | Action | Expected |
|---|---|---|
| 1.1 | `curl http://localhost:3000/api/projects` | 200; JSON array with `roots` + `zoo`, both `is_active: true` |
| 1.2 | `curl http://localhost:3000/api/projects/roots` | 200; project detail object |
| 1.3 | `curl http://localhost:3000/api/projects/does-not-exist` | 404 |

---

## 2. Admin — Projects CRUD (Day 7, plan §2.3 + §2.6)

Login as `admin` / `admin123`.

| # | Action | Expected |
|---|---|---|
| 2.1 | Navigate `/admin/projects` | Two rows: ROOTS, ZOO. Both active. |
| 2.2 | Click ROOTS row | Detail page with tagline/vision/mission/description fields |
| 2.3 | "New Project" → slug `test-proj`, name `Test Project`, tagline `e2e test` → Save | Redirect to detail; row appears in list |
| 2.4 | Toggle `test-proj` inactive | `GET /api/projects` no longer returns it publicly |
| 2.5 | Toggle `test-proj` active again | Reappears in public list |
| 2.6 | On detail, add accomplishment (title + description + metric) → Save | Entry visible in accomplishments list |
| 2.7 | Edit + delete the accomplishment | Updates persist; row disappears on delete |
| 2.8 | Delete `test-proj` | 200; project gone from list |
| 2.9 | Try creating a project with slug `roots` | 409 conflict / error toast |

---

## 3. Public — Project pages (Day 3, plan §2.4 + §7.1)

Use an incognito window.

| # | Action | Expected |
|---|---|---|
| 3.1 | Open `/projects/roots` | Hero + vision + mission + accomplishments + description + "Contribute" CTA all render |
| 3.2 | Open `/projects/roots/accomplishments` | Full accomplishments view |
| 3.3 | Open `/projects/zoo` | Renders (sparse content OK) |
| 3.4 | Open `/projects/does-not-exist` | 404 / graceful error |

---

## 4. Events linked to projects (Day 2 + Day 7, plan §3)

| # | Action | Expected |
|---|---|---|
| 4.1 | Admin → `/admin/events` | Form has Project dropdown listing ROOTS / ZOO |
| 4.2 | Open the seeded "ROOTS Marathon 2026" detail | `project_id` populated; schedule + venue + contact fields visible |
| 4.3 | Event list view | "Project" column populated for the event |
| 4.4 | Public event landing page for ROOTS Marathon | "Supports ROOTS" badge/link, schedule, venue, contact rendered |
| 4.5 | Click ROOTS link from event landing | Lands on `/projects/roots` |

---

## 5. User signup + dashboard project cards (Day 3, plan §7.1)

In a fresh incognito tab:

| # | Action | Expected |
|---|---|---|
| 5.1 | `/signup` → register as **individual**, fill name/email/phone/password, user type student or individual | Account created, lands on dashboard |
| 5.2 | Open Profile → fill address line 1, line 2, city, state, pincode, PAN (e.g. `ABCDE1234F`) | All fields save |
| 5.3 | Dashboard | Two project cards (ROOTS, ZOO) below user info; each links to `/projects/<slug>` |
| 5.4 | Referral section text | Reads **"1 point for every ₹100"** (not ₹1) |
| 5.5 | Copy the referral code from dashboard | Save for §8 |

**Verify in SQL** (replace `<email>`):
```sql
SELECT email, user_type, referral_code, pan_number, city FROM users WHERE email='<email>';
```

---

## 6. Donate to a project (Day 5, plan §4)

Still logged in as the user from §5.

| # | Action | Expected |
|---|---|---|
| 6.1 | Click "Donate" | Modal opens, project picker shows ROOTS + ZOO |
| 6.2 | Pick ROOTS, ₹500, **no** 80G checkbox | Razorpay modal opens |
| 6.3 | Use test card `4111 1111 1111 1111`, any future expiry, any CVV/OTP | Payment success toast |
| 6.4 | Dashboard donation history | Row with ₹500, status `completed` |
| 6.5 | Repeat with ZOO, ₹300 | Second donation row, project = ZOO |

**Verify:**
```sql
SELECT d.amount, p.slug, d.status, d.points_awarded
  FROM donations d JOIN projects p ON d.project_id = p.id
  WHERE d.user_id = (SELECT id FROM users WHERE email='<email>')
  ORDER BY d.created_at DESC;
```
Expect rows with the correct slugs. Points = `FLOOR(amount/100)` (5 and 3 here).

| # | Action | Expected |
|---|---|---|
| 6.6 | Admin → Donations list | Project filter dropdown lists ROOTS/ZOO; rows show project column |
| 6.7 | Filter by ROOTS | Only ROOTS donations visible |
| 6.8 | Excel export | Downloads `.xlsx` with a Project column |

---

## 7. 80G auto-generated certificate (Day 4, plan §6)

Same user, with profile fully filled (§5.2).

| # | Action | Expected |
|---|---|---|
| 7.1 | "Donate" → ROOTS, ₹2000, **check 80G certificate** | Razorpay opens |
| 7.2 | Complete with test card | Payment success |
| 7.3 | Dashboard certificate area | Request with status `approved` and a **Download** button |
| 7.4 | Check mailbox of user's email | "80G certificate" email arrived (from `mails@blackitechs.in`) |
| 7.5 | Click Download | PDF opens. Verify it contains: ICE name + 80G reg #, donor full name + address + PAN, amount in figures **and words**, Razorpay payment id, project name (ROOTS) |
| 7.6 | Admin → Certificates | Row with status `approved`, `auto_generated = true`, Download + Regenerate buttons |
| 7.7 | Click Regenerate | New PDF (timestamp updates, download still works) |
| 7.8 | Failure path: admin Settings → clear `ice_pan`, save. Donate ₹500 with 80G | Payment succeeds, cert status stays `pending`, no PDF. **Restore `ice_pan` to `AAATI1234F` after.** |

**Verify:**
```sql
SELECT cr.status, cr.auto_generated, cr.certificate_number, cr.certificate_url, cr.generated_at
  FROM certificate_requests cr
  WHERE cr.user_id = (SELECT id FROM users WHERE email='<email>')
  ORDER BY cr.created_at DESC;
```

---

## 8. Referral cutover ₹1 → ₹100 (Day 5, plan §5)

| # | Action | Expected |
|---|---|---|
| 8.1 | Note user A's current `referral_points` (from §5 dashboard) | e.g. `0` |
| 8.2 | Fresh incognito tab → `/signup` using user A's referral code from §5.5 | User B created |
| 8.3 | Log in as user B → donate ₹500 to ROOTS (test card) | Payment success |
| 8.4 | Back to user A's dashboard, refresh | Referral points went up by **5** (₹500 / ₹100), NOT 500 |
| 8.5 | Dashboard text | Still says "1 point for every ₹100" |

**Verify:**
```sql
SELECT u.email, u.referral_points
  FROM users u WHERE u.email IN ('<userA>', '<userB>');

SELECT d.amount, d.points_awarded, d.referred_by
  FROM donations d
  WHERE d.user_id = (SELECT id FROM users WHERE email='<userB>');
```
`points_awarded` on user B's donation = `5`; user A's `referral_points` increased by 5.

---

## 9. Event registration + enrollment tracking (Day 6, plan §3.2)

| # | Action | Expected |
|---|---|---|
| 9.1 | Open `/events/<event-id>/register` for ROOTS Marathon in a **third** incognito tab | Registration form |
| 9.2 | Register a **brand-new email** (signup-during-event flow) | Success page |
| 9.3 | Check DB (below) | New user row has `enrolled_via_event_id` = ROOTS Marathon id |
| 9.4 | Register **user A** (from §5) for the same event | If A's `enrolled_via_event_id` was NULL, it gets set. If already set, it is **not overwritten**. |
| 9.5 | Admin → User detail of user from 9.2 | "Enrolled via: ROOTS Marathon 2026" shown |

**Verify:**
```sql
SELECT u.email, u.enrolled_via_event_id, e.event_name
  FROM users u LEFT JOIN events e ON u.enrolled_via_event_id = e.id
  WHERE u.email IN ('<event-signup-email>','<userA>');
```

---

## 10. Failed donation retry (Day 7, plan §7 — added feature)

| # | Action | Expected |
|---|---|---|
| 10.1 | Logged in as user A, click Donate → ROOTS, ₹500. **Close Razorpay modal without paying.** | Donation row appears with status `pending` or `failed` |
| 10.2 | Dashboard donation history | Failed/pending row has a **Retry** pill next to status |
| 10.3 | Click Retry | Razorpay re-opens with the same amount + project + 80G flag |
| 10.4 | Complete with test card | Status flips to `completed` |

---

## 11. Admin dashboard (Day 7, plan §8.2)

| # | Action | Expected |
|---|---|---|
| 11.1 | `/admin/dashboard` Stats Grid | Users / total raised / this month / certificates all populated |
| 11.2 | Projects section below stats | Tiles for ROOTS + ZOO with per-project raised / donors / events |
| 11.3 | Click a project tile | Lands on `/admin/projects/:id` |
| 11.4 | "Manage →" button | Lands on `/admin/projects` |
| 11.5 | Recent Registrations + Top Donors | Populated with users from §5–§9 |

---

## 12. Admin — User detail enrichment (Day 7, plan §8.4)

Open user A's detail page from registrations.

| # | Action | Expected |
|---|---|---|
| 12.1 | Profile card | "Enrolled via: …" line populated if applicable |
| 12.2 | Donations tab | "By project" breakdown cards (ROOTS / ZOO totals); Project column in history table |
| 12.3 | Referrals tab | User B listed with their `total_donated` (₹500) |
| 12.4 | Events tab | Lists every event the user registered for, with status |
| 12.5 | Certificates tab | Lists 80G requests with status badge |

---

## 13. Edge cases / regression

| # | Action | Expected |
|---|---|---|
| 13.1 | `curl -X POST http://localhost:3000/api/donations/create-order -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"amount":100}'` (no `projectId`) | Donation row's `project_id` defaults to ROOTS id |
| 13.2 | Toggle ROOTS inactive in admin. Public `/projects/roots` | 404. Dashboard project picker drops ROOTS. **Re-activate after.** |
| 13.3 | `npx prisma migrate status` | Up to date |
| 13.4 | Stop backend, drop + recreate `fundraiser_db`, run `npx prisma migrate deploy` | All 9 migrations apply cleanly; ROOTS + ZOO re-seed |
| 13.5 | Cert PDF location | `fund-raiser-backend/uploads/certificates/<certificate-number>.pdf` exists |
| 13.6 | Two browser tabs (user + admin). Donate in user tab → refresh admin dashboard | Totals update |

---

## When all 13 sections are green

1. Verify branch state:
   ```powershell
   git status            # clean working tree
   git log --oneline main -10
   ```
2. Push to origin (already done if you ran the ship sequence): `git push origin main`.
3. Deploy to prod:
   - Backend: git pull, `npm install`, `npx prisma generate`, `npx prisma migrate resolve --applied "0_init"` (**first time only**), `npx prisma migrate deploy`, `pm2 restart fundraiser-api`.
   - Frontend: rebuild (`npm run build --configuration=production`), upload `dist/fund-raiser-frontend/browser/*` to LiteSpeed webroot.
4. Prod canary: `curl https://api.icenetwork.in/api/projects`, then visit `https://app.icenetwork.in/projects/roots` in incognito.

---

## Cleanup (optional, after testing)

```sql
-- Remove the test event
DELETE FROM events WHERE event_name='ROOTS Marathon 2026';

-- Remove test users (cascades to donations, event_registrations, cert_requests if FKs set up)
DELETE FROM users WHERE email IN ('<userA>','<userB>','<event-signup-email>');

-- Reset org_settings if you want a clean slate
UPDATE org_settings SET setting_value = NULL WHERE setting_key LIKE 'ice_%';
```
