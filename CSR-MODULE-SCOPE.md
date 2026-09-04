# CSR Module — Scope of Work

## Workstream 1 — Website: CSR Collaboration Page
**Cost:** 12,000 INR · **Duration:** 4 days

- Build a new CSR Collaboration page, linked from main site navigation
- "Why partner with ICE" intro section with impact highlights
- CSR opportunities section — programme/project cards pulled with description, focus area, contribution modes
- Areas of contribution section (thematic areas)
- "Partner With ICE" CTA button that opens the enquiry form
- CSR Compliance & Registration section
- Footer compliance strip: CSR-1 Registered | 12A | 80G | Section 8
- In-browser CSR-1 certificate PDF viewer with download
- Responsive across desktop/tablet/mobile

## Workstream 2 — Enquiry Form + Notifications

- Form with mandatory fields (company, contact person + designation, email, phone, CSR budget, area of interest, preferred project) and optional fields (location, message)
- Area of Interest and Preferred Project as dropdowns populated live from the Projects module
- Field-level validation (email, phone, budget) with inline errors
- CAPTCHA + rate limiting
- Auto-generated sequential CSR ID (format `ICE-CSR-2026-0001`)
- On-screen success confirmation showing the ID
- Acknowledgement email to submitter
- Internal alert emails to Communications and Connect inboxes, with deep link to the admin record
- Assignment email to the owner; configurable status-change alerts
- Admin-editable ICE-branded HTML email templates

## Workstream 3 — Admin Dashboard CSR Module
**Cost:** 32,000 INR · **Duration:** 5 days

- Enquiry list view (CSR ID, company, contact, budget, area, project, status, owner, date)
- Search + filters: status, owner, project, area, budget range, date range, free-text
- Enquiry detail screen (data, status, owner, notes, documents, milestones, history)
- Summary metrics header: total enquiries, by stage, committed value, funds received, active partnerships
- Role-based access tied to existing admin/sub-admin roles
- 13-stage status workflow (New Enquiry → Closed/Renewal)
- Status update with optional reason capture
- Assign/reassign owner
- Timestamped attributed internal notes
- Document upload with file type/size validation
- Milestones with target vs actual dates
- Immutable activity/audit log
- CSR pipeline report (by stage, owner, project, with committed vs received values)
- Excel/CSV export of any filtered view
- Date-range reporting including financial-year presets
