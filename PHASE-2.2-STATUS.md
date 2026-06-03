# Phase 2.2 — Status

Last updated: 2026-06-03

Phase 2.2 of the ICE fundraiser platform has two pillars per the client proposal:

1. **CSR Integration** — open the platform to corporate donors, with compliance + reporting wired into the donation flow
2. **Merchandise Store** — let the existing community spend their referral points

This document tracks the live state of both pillars.

---

## Pillar 1 — CSR Integration

### Shipped

| Theme | What landed |
|---|---|
| **CSR showcase carousel** | Public `csr_activities` table; admin CRUD at `/admin/csr` (list/create/edit/reorder/toggle/delete); dashboard carousel pulling from `GET /api/csr/active`. Seeded with 3 demo partners (Infosys / Wipro / Tata). |
| **Corporate signup foundation** | `corporate_profiles` table — 1:1 sidecar to `users` where `user_type='organization'`, FK CASCADE. Fields: CIN, GSTIN, CSR-1 reg #, industry, incorporated year, authorized signatory (name/designation/email/phone). All nullable. |
| **Corporate fields in register flow** | Step 5 (org branch) now collects CSR & corporate details + Authorized signatory. Backend `registerUser` inserts the sidecar row when provided. |
| **Corporate fields in profile editor** | `/profile` shows two extra sub-sections (CSR & Compliance, Authorized Signatory) when `userType='organization'`. UPSERT via `ON DUPLICATE KEY UPDATE` with COALESCE — partial edits OK. |
| **CSR donation tagging** | `donations.purpose` enum extended with `csr_donation`; new `csr_reference_number` column. Donate modal shows "Tag as CSR donation" toggle + reference # input — visible only when user is org with CSR-1 reg #. Backend silently downgrades 'csr_donation' from ineligible users to plain 'donation' (defence-in-depth). |
| **CSR badge in donation history** | Dark-accent "CSR" pill on history rows; hover-title shows reference #. |
| **Form CSR-2 PDF auto-gen** | `certificate_requests.type` enum: `'80g' | 'csr_receipt'`. On CSR donation verify, parallel block to the 80G hook auto-creates a `type='csr_receipt'` row and queues `certificate.service.generate`. Generation pulls `corporate_profiles` data + CSR ref # via raw SQL, allocates receipt numbers as `ICE/CSR/<FY>/<seq>`. New `renderCsrReceipt` PDF template with Section-135 wording + Form CSR-2 friendly footer. |
| **Receipt download** | "Receipt" button on dashboard donation rows (dark accent), reuses existing `GET /api/user/certificates/:id/download`. |
| **Corporate dashboard rollup** | New "Your CSR contributions" section on dashboard (above stats grid), org-only. Headline strip: Lifetime / Current FY / Last FY / Projects funded. Below: by-project + by-fiscal-year breakdowns + Recent receipts with download buttons. Backed by `GET /api/user/csr-summary` (returns null for non-orgs). Indian FY boundary (April 1). |
| **Project page co-branding** | `GET /api/projects/:slug/csr-sponsors` aggregates completed CSR donations by org. New "CSR partners powering X" card on the project landing page — hidden when empty, shows name + industry + total + count, ordered by spend. |

### Pending in CSR Integration (excluding Merch)

| # | Item | Rough effort | Why it matters |
|---|---|---|---|
| 1 | **Tranched CSR donations** (multi-installment pledges) | 4–6 hr | Corporates often commit ₹X/year in 4 quarterly tranches. Needs a `csr_pledges` table, scheduling/reminders, optional Razorpay subscriptions OR manual per-tranche flow. Per-proposal scope. |
| 2 | **Logo upload on `corporate_profiles`** | ~30 min | Co-branding sponsor strip currently shows names only. With logos it becomes a proper "powered by" wall. |
| 3 | **Admin view of corporate profiles** | ~45 min | Admin can see donations but can't see corp meta (CIN/GSTIN/CSR-1/signatory) per user. Useful for compliance audits. |
| 4 | **`/admin/certificates` type filter + clearer columns** | ~30 min | Admin cert page now mixes 80G + CSR receipts. Add a `type` filter pill and separate columns. |
| 5 | **CSR-specific email template** | ~45 min | Donation confirmation email is generic. CSR donors should get a CSR-themed email with receipt attached or linked, optionally cc'd to the authorized signatory. |
| 6 | **FY-end CSR rollup export (CSV / PDF)** | ~1 hr | Corporates need a single file with all CSR donations in a FY for their Form CSR-2 filing. Data exists; needs a "Download FY 2026-27 summary" button. |
| 7 | **CSR receipt PDF polish** | ~15 min | Verify signatory image renders, double-check watermark + footer wording with a real receipt. |

### Not in scope (declared out)

- MCA portal API integration to verify CIN / GSTIN / CSR-1 in real time
- Multi-currency CSR (INR only)
- Auditor digital signature on receipts (v1)

---

## Pillar 2 — Merchandise Store

**Status: not started.** Multi-day pillar. Themes per proposal:

- Admin-managed product catalogue
- Points-based pricing (aligned with the ₹100/point referral cutover from Phase 2.1)
- Cart + checkout flow
- Orders + fulfilment + shipping tracking
- User order history
- Admin order + inventory views

---

## Side polish landed this session (Phase 2.1 hot-fixes)

| Area | Fix |
|---|---|
| User login | "Invalid credentials" banner now renders — NgZone.run wrap around HTTP subscribe handlers (same fix as admin login from commit `13298d0`). The `withFetch()` CD gap remains the underlying issue ([[project_withfetch_cd_gap]]). |
| Event landing page | Hero title white text fix (base `h1 { color: #102a43 }` was overriding section `text-white` via inheritance); explicit `text-white` ngClass branch on h1. |
| Event landing nav | "About / How / Venue" links now scroll to in-page sections via `scrollTo($event, id)` with `scroll-margin-top: 5rem` for sticky topbar offset. Previously routed to `/#about` because router intercepted the `#hash` clicks. |
| Event landing | Removed "Event Details" button from hero; added Login button after Register; both Register + Login open in `target="_blank"`. |
| Event registration page | Calendar + map-pin icons now render via explicit `inline-flex` containers (previous `<lucide-icon>` inside `<p>` with `align-middle` was rendering as empty boxes). |
| Donate flow — PAN gate | When user opts for 80G but has no PAN on profile, a PAN-prompt modal appears before Razorpay. PAN saves to profile via `PUT /user/profile`, then continues into Razorpay. Has "Skip 80G & donate" exit. |
| Donate flow — resume pending | `POST /api/donations/resume` reuses the existing `razorpay_order_id` so retrying a pending donation doesn't start a new Razorpay order. "Resume payment" pill on `pending` and `failed` rows. |
| Register flow | OTP step removed (4 steps now, was 5); ₹300 payment text replaced with "Create Account"; backend OTP verification gate removed from `registerUser`. |
| SMS service | Dev-mode fallback when Twilio creds are absent — OTP is logged to backend console instead of crashing. Prod behavior (real Twilio call) unchanged when creds present. |
| Profile post-save | Three-option modal after Save: **Make a donation** (routes to `/dashboard?donate=1` which auto-opens donate modal), **Go to dashboard**, **Stay & review**. |

---

## Migrations applied this session (3)

```
20260603140000_phase22_corporate_profiles   → new corporate_profiles table
20260603150000_phase22_csr_donations         → donations.purpose += 'csr_donation', csr_reference_number col, index
20260603160000_phase22_csr_receipt_type      → certificate_requests.type ENUM('80g','csr_receipt'), index
```

All applied locally. Prisma client regen was blocked on Windows EPERM (backend running). Existing code reads/writes new columns via raw mysql2, so this is non-blocking. Next clean backend restart, run `npx prisma generate`.

---

## How to resume on next session

1. Re-read this file + the relevant memory files
2. Re-spin local dev (per [[reference_local_dev_env]]):
   - MySQL likely already running via XAMPP
   - Backend: `cd fund-raiser-backend && npm run dev`
   - Frontend: `cd fund-raiser-frontend && npx ng serve --port 4200`
3. Run `npx prisma generate` in backend (now that backend is restarting from cold)
4. Pick the next CSR Integration item (recommend tranched donations OR FY-end export) — or kick off Merchandise Store if pivoting

---

## Production deploy status

**Not deployed.** Local `main` is now several commits ahead of prod after this session. New migrations + new endpoints + new tables. Production still on the Phase 2.1 commit set per [[project_phase21_day8_plan]]. Deploy procedure unchanged — see [[project_phase2_ship_state]].
