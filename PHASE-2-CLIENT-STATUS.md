# ICE Network Fundraiser — Phase 2 Status Update

_Date: 25 May 2026_

This status report mirrors the Phase 2 proposal, with completion status against every item promised.

---

## At a glance

| Phase | Scope | Status |
|---|---|---|
| **2.1 — Multi-Project Fundraising Engine** | Projects, linked events & donations, automated 80G, updated referrals, dashboard upgrades | **✅ Built — pending production deployment** |
| **2.2 — CSR Integration & Merchandise Store** | Corporate donor onboarding, rewards-redemption store | 🟡 R&D / Planned — to begin after 2.1 goes live |

---

## Phase 2.1 — Multi-Project Fundraising Engine

### 1. Projects — the heart of the platform ✅

Every event, donation, and participant on the platform is now linked to a project. Two projects are seeded and active: **ROOTS** and **ZOO**.

**Each project carries:**
- ✅ Name, tagline, and logo
- ✅ Full description, vision statement, and mission statement
- ✅ A list of accomplishments with measurable metrics
- ✅ A banner image carousel (multiple banners per project)

**What users see:**
- ✅ Project cards on the user dashboard linking to each cause
- ✅ The project a donation is going to, shown clearly at the time of giving
- ✅ Dedicated project page with banners, vision, mission, and accomplishments
- ✅ Detailed accomplishments page

**What the admin team can do:**
- ✅ Create and manage projects and their accomplishments from the admin panel
- ✅ Edit a project's content, images, and details at any time
- ✅ View donation totals, contributor counts, and event activity per project
- ✅ Mark a project as active or inactive

### 2. Events linked to projects ✅

- ✅ Every event is created under a specific project (e.g. ROOTS Marathon → ROOTS)
- ✅ Event landing page shows which project the event supports, with a link to the project page
- ✅ Richer event page with hero banner, schedule, venue details, and contact information
- ✅ Admin event list shows the project each event belongs to
- ✅ **Enrollment tracking** — when a participant first joins via an event registration, the platform records which event brought them in. Existing enrollment data is never overwritten.

### 3. Donations linked to projects ✅

- ✅ Every donation is tagged to a project — visible to both donors and admins
- ✅ Donor dashboard shows the project for each donation
- ✅ Admin donations table can be filtered by project
- ✅ Per-project breakdown on the admin dashboard
- ✅ Excel exports include the project name
- ✅ Per-participant per-project contribution view in the admin user profile

### 4. Updated referral rewards ✅

|  | Phase 1 | Phase 2 |
|---|---|---|
| Calculation | 1 point per ₹1 | **1 point per ₹100** |
| Example | ₹2,000 = 2,000 pts | ₹2,000 = 20 pts |

- ✅ Existing participant points are preserved — the new formula applies only from cutover onwards
- ✅ All referral copy across the platform updated to the new ₹100/point text

### 5. Automated 80G tax certificates ✅

The previous manual review-and-approve flow is replaced by full automation:

- ✅ Participant donates and requests an 80G certificate
- ✅ Payment confirmation triggers automatic PDF generation
- ✅ Certificate is emailed to the participant with a download link
- ✅ Participant can download it anytime from their dashboard
- ✅ Admin team can view, download, or regenerate any certificate from the admin panel

**The certificate includes:**
- ✅ ICE organisation details, 80G registration number, and PAN
- ✅ Donor's full name, address, email, phone, and PAN
- ✅ Donation amount in figures **and words**, date, payment reference, project name
- ✅ Unique auto-generated certificate number

**Reliability:** ✅ If PDF generation fails for any reason, the payment is not affected — the certificate stays in a `pending` state and the admin team can regenerate it manually at any time.

### 6. User dashboard updates ✅

- ✅ Two project cards (ROOTS and ZOO) on the dashboard, each linking to its public page
- ✅ Updated referral text reflects the new 1-point-per-₹100 formula
- ✅ Approved certificates show a **Download** button directly on the dashboard
- ✅ Bonus: failed/pending donations show a **Retry** option that re-opens payment with the same amount + project + 80G flag

### 7. Admin panel updates ✅

- ✅ New **Projects** section in the sidebar — create, edit, manage all projects
- ✅ Per-project stats on the admin dashboard (donations and contributor counts)
- ✅ Project filter on the donations table
- ✅ Enriched participant profiles — shows the event that enrolled them and a project-wise donation breakdown
- ✅ Certificate controls — Download and Regenerate buttons for every certificate, plus a status indicator showing auto-generated vs manually processed
- ✅ Bonus: **Organisation Settings** panel — edit ICE legal name, PAN, 80G reg number, validity dates, registered address, and signatory directly from the admin UI

---

## What's pending before Phase 2.1 is officially live

| Item | Owner | Status |
|---|---|---|
| Production deployment (`app.icenetwork.in` + `api.icenetwork.in`) | Engineering | Scheduled this week |
| Database migration on production | Engineering | Part of deploy |
| Smoke-test the live environment | Engineering | Immediately post-deploy |
| Final sign-off walkthrough with ICE team | ICE + Engineering | Once smoke tests are green |

---

## Phase 2.2 — CSR Integration & Merchandise Store

_Timeline: kicks off once 2.1 is live. Currently in R&D / Planning._

Two additions in this phase:

### A. CSR Integration

Opens the platform to **corporate donors** — companies looking to deploy CSR budgets through ICE.

Planned themes (to be confirmed in the 2.2 kickoff):
- A dedicated corporate-donor signup and verification flow
- CSR-specific donation workflow (often larger amounts, sometimes tranched)
- 80G + CSR compliance documentation (Form CSR-2 / receipts as required)
- Corporate-facing dashboards showing impact and project-wise allocation
- Co-branding options on project pages for sponsoring corporates

### B. Merchandise Store

Gives the **existing community** a place to spend the rewards they've earned.

Planned themes (to be confirmed in the 2.2 kickoff):
- Product catalogue managed by the admin team
- Points-based pricing aligned with the updated ₹100/point referral structure
- Order, fulfilment, and shipping management
- User order history in the dashboard
- Admin order processing and inventory views

---

## Suggested next sync agenda

1. Confirm Phase 2.1 production deploy date and demo time
2. Walkthrough of the live platform with the ICE team
3. Phase 2.2 kickoff — confirm scope, priorities, and target timeline for CSR + Store

---

_Prepared by the engineering team. Please share feedback before the 2.2 kickoff so it can be folded into scope._
