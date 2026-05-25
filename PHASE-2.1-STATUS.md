# Phase 2 — Status snapshot (2026-05-25)

Status of the **Phase 2.1 foundation** work and the **Phase 2.2 open items** ahead of it.

- Branch: `main` (Phase 2.1 work fast-forwarded + pushed)
- Stack: Angular 21 frontend, Node/Express backend, Prisma 6.19 on MariaDB/MySQL
- Prisma migrations applied: **9** (`0_init` + 8 Phase 2)

---

## ✅ Phase 2.1 — shipped (Days 1–7)

Each row = one Day commit on `main`. Audit codes (B*/M*) come from the external Phase 2 audit master list.

| Day | Commit | What landed |
|---|---|---|
| 0 | `3e896e9` | Prisma adopted alongside legacy `mysql2`. `org_settings` table + admin Settings API/UI (ICE legal name, PAN, 80G reg #, validity, address, signatory). |
| 1–2 | `88532ff` | `projects` entity + `project_accomplishments`. ROOTS + ZOO seeded. `events.project_id` + `donations.project_id` linkage. Backfill migration assigns existing rows to ROOTS. Public `/api/projects` + `/api/projects/:slug`. |
| 3 | `ec332a7` | Public project surfaces: `/projects/:slug` landing + `/projects/:slug/accomplishments`. User dashboard project cards (ROOTS / ZOO). Event landing shows "Supports …" project badge. |
| 4 | `ccbea3e` | PDF 80G certificate subsystem: server-side PDF render (`pdf.template.js`), amount-in-words util, certificate auto-issuance on completed donation when 80G requested + org_settings present. Admin Certificates page Regenerate. Audit **B4** fix. |
| 5 | `014f93d` | Referral points cutover **₹1 → ₹100 per point** (`referral-points.js` util). v1 history frozen at the migration boundary; v2 default going forward. Audits **M10 / M11**. |
| 6 | `40c58bc` | Enrollment tracking — `users.enrolled_via_event_id` populated on event-registration signup; never overwritten if already set. Audits **B1 / B3 / M4**. |
| 7 | `ac919be` | Admin dashboard per-project tiles (raised / donors / events). User dashboard **Retry** pill for pending/failed donations re-opens Razorpay with the same amount + project + 80G flag. |
| fix | `42fa970` | Leaderboard Prisma views switched from `@id` to `@unique` (Prisma 6.19+ rejects `@id` on views). |

### Surfaces touched

- **Migrations (8 new):** `phase2_org_settings`, `phase2_projects`, `phase2_events_link`, `phase2_donations_link`, `phase2_backfill_project_id`, `phase2_certificates`, `phase2_referral_cutover`, `phase2_users_enrollment`.
- **Backend services:** `project.service.js`, `certificate.service.js`, `pdf.template.js`, `utils/amount-in-words.js`, `utils/referral-points.js`; updates to `donation`, `event`, `email`, `auth`, `user`, `admin`, `webhook`.
- **Frontend admin:** Projects list/create/detail, Settings page (org_settings editor), Dashboard project tiles, Donations project filter + column, Certificates Regenerate, User detail enrichment.
- **Frontend public/user:** Project landing + accomplishments routes, Dashboard project cards, donation modal project picker, retry pill, ₹100/point copy.

### How to validate locally

`test.md` at the repo root has the full 13-section walkthrough (sections 1–13 cover everything above + edge cases). All sections green = Phase 2.1 e2e-clean.

---

## 🟡 Phase 2.2 — open items

Two buckets: **carry-overs** (Phase 2.1 work not yet sealed) and **next-phase scope** (audit master list lives outside the repo — confirm before scanning).

### Carry-overs from 2.1

| Item | State |
|---|---|
| **Prod deploy of Phase 2.1** | Open. Sequence in `test.md` §"When all 13 sections are green" → step 3. Backend needs `migrate resolve --applied "0_init"` once, then `migrate deploy`; frontend prod build → LiteSpeed webroot. |
| **Prod smoke** | Open. `curl https://api.icenetwork.in/api/projects` + visit `https://app.icenetwork.in/projects/roots` in incognito. |
| **Uncommitted local edits** | `fund-raiser-frontend/angular.json`, `src/app/app.config.ts`, `src/app/pages/admin/admin-dashboard/admin-dashboard.component.html`, `src/environments/environment.ts`. Decide: ship as a 2.1 follow-up commit, fold into 2.2, or revert. |
| **`fund-raiser-backend/.env.production`** | Untracked locally — must stay untracked (contains live secrets). |

### Next-phase scope — **needs confirmation**

The Phase 2 audit master list (B/M/Q codes) is **not in the repo**. Phase 2.1 closed B1, B3, B4, M4, M10, M11. Anything else referenced in the master list — B2, other B*, other M*, Q* — has not been touched yet.

Before I scope 2.2, I need from you:

1. Which audit codes are in 2.2 scope?
2. Any new feature work landing in 2.2 outside the audit list?
3. Plan §3.4 `events.contact_info` — descoped or still on the list? (Currently absent from migrations and code; treated as descoped.)

Once confirmed I can fill this section with a Day-by-Day cadence matching the Phase 2.1 style.

---

## Reference

- Local dev: XAMPP MySQL `localhost:3306` (`root` / empty), `npm run dev` (backend :3000), `npm start` (frontend :4200).
- Prod: `app.icenetwork.in` / `api.icenetwork.in`, Hostinger MariaDB, LiteSpeed, pm2 service `fundraiser-api`.
- Test workflow: `test.md` (repo root).
