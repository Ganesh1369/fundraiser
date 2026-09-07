# Volunteer Module — Scope of Work

## Workstream 1 — Website: Volunteer Page

- New Volunteer page with nav entry and footer link
- "Why volunteer with ICE" intro section
- Volunteer opportunities cards — role title, focus area, location, time commitment
- "Who can apply" eligibility section
- Apply Now CTA opening the registration form
- Responsive across desktop/tablet/mobile

## Workstream 2 — Registration Form & Data Store

- Mandatory fields: full name, date of birth, email, phone, city, pincode, occupation type (student / working / other), institution or employer, availability (weekday / weekend, hours per week)
- Student field: college name, course
- Optional: languages spoken, message
- Emergency contact: name, relationship, phone
- Consent checkboxes: data use, photo/media
- Photo and ID proof upload with file type/size validation
- Field-level validation with inline errors; CAPTCHA and rate limiting
- Duplicate detection on email and phone
- Auto-generated Volunteer ID (`ICE-VOL-2026-0001`)
- On-screen confirmation showing the ID
- Volunteer table in the existing database

## Workstream 3 — Admin Dashboard: Volunteer Master

- Volunteer list view — Volunteer ID, name, city, occupation type, institution, area of interest, availability, date registered
- Search and filters: area of interest, occupation type, institution, city, availability, date range; free-text search on name, email, phone
- Volunteer detail view — submitted data and uploaded documents, read-only
- Simple active / inactive toggle (not a workflow, just a flag so old records can be hidden from the default list)
- Excel / CSV export on any filtered view
- Count summary at the top: total registered, by pincode, ...
