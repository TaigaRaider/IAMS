# Software Requirements Specification (SRS)
## IAMS — Internship Application & Management System

| | |
|---|---|
| **Product** | IAMS — Internship Application & Management System |
| **Version** | 1.0 (demo) |
| **Status** | Draft for product demo |
| **Date** | 2026-08-20 |
| **Stack** | React 19 (Vite) client · Express 5 server · Turso/libSQL (SQLite) via Drizzle ORM · JWT auth |

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements of IAMS, a web application that manages the full internship lifecycle for a company: **applicant → candidate → intern**. It is written as the reference for the product demo and future development.

### 1.2 Scope
IAMS covers:

- Account lifecycle for **applicants**, **interns**, and **administrators**
- Job-post role management
- Applications and a status workflow with interview scheduling
- Offer creation, negotiation, and acceptance
- Intern management (directory, onboarding, tasks)
- Dashboard reporting and data exports
- Notifications and email delivery
- Security hardening (session revocation, lockouts, rate limiting, audit-friendly deletion)

Out of scope for v1: 2FA/TOTP, audit log, full-text search with pagination, httpOnly refresh-token rotation, persistent lockout storage.

### 1.3 Definitions
| Term | Meaning |
|---|---|
| Applicant | Signed-in user who has not been hired |
| Intern | User hired via an accepted + confirmed offer (auto-promoted from applicant) |
| Admin | User with the `admin` role; manages roles, applications, interviews, offers, interns |
| Offer | Formal employment terms sent to a candidate; can be revised through negotiation |
| Onboarding step | Checklist item an intern must complete after hiring |
| Text-packet transport | Mechanism that stores uploaded files as Reed–Solomon data+parity fragments |

### 1.4 References
- `FEATURES.md` — feature inventory (needs refresh; this SRS supersedes it for the demo)
- `graphify-out/GRAPH_REPORT.md` — architecture-level module map

---

## 2. Overall Description

### 2.1 Product Perspective
IAMS is a standalone, cloud-hosted web app. A React SPA communicates with a JSON REST API. Data lives in Turso (libSQL / SQLite). Email is sent via SMTP (Nodemailer); in development, verification codes are mirrored to the server log. Uploaded files are stored on the server filesystem under `server/src/uploads/` and served under `/api/uploads`.

### 2.2 User Roles
1. **Applicant** — signs up, verifies email, browses open roles, applies, withdraws while "In Review", views/cancels interviews, receives and negotiates offers, accepts/declines.
2. **Intern** — post-hire dashboard with onboarding checklist, documents upload, onboarding forms, assigned tasks, notifications.
3. **Admin** — creates roles, reviews/marks applications, schedules and conducts interviews, assigns interviewers, drafts/extends/negotiates/confirms offers, manages interns and their tasks/onboarding, views dashboard metrics, exports data.

### 2.3 Operating Environment
- Client: modern evergreen browsers; responsive layout.
- Server: Node.js ≥ 20 (dev tested on 24.x), Express 5.
- Database: Turso (libSQL) with SQLite semantics; schema managed by Drizzle migrations.
- Auth: stateless JWT (HS256) sent as `Authorization: Bearer`; httpOnly cookie fallback; versioned tokens for instant revocation.

### 2.4 Design & Implementation Constraints
- SQLite/Turso data model; Drizzle ORM + generated migrations (`server/drizzle/`).
- Client bundles in one page tree with role-guarded routes (`/applicant/*`, `/intern/*`, `/dashboard/*`).
- Email is **fire-and-forget** (never blocks the request).
- File uploads limited to 5 MB; PDF/Word/TXT/images for documents; PNG/JPG for avatars.

### 2.5 Assumptions & Dependencies
- A real SMTP relay is configured for production delivery; dev falls back to console logs.
- Company HR contact (`hr@iams.dev`) exists for onboarding escalations.
- Demo data is seeded manually via scripts (`src/scripts/create-admin.js`, seed scripts).

---

## 3. Specific Requirements

### 3.1 Functional Requirements

#### FR-1 Authentication & Account Management
- **FR-1.1 Signup** — capture full name, email, username, password. Enforce: bcrypt (cost 12), password ≥ 8 chars with a letter and a number, valid email, unique email (among live accounts) and username. Duplicate → 409 with a clear message.
- **FR-1.2 Email verification** — 6-digit code, single-use, 30-minute expiry, stored hashed (SHA-256), max 5 attempts, 60-second resend cooldown.
- **FR-1.3 Login** — username + password; per-username lockout (15 fails → 60 s), per-route IP rate limits, timing-equalized for unknown accounts (no enumeration).
- **FR-1.4 Sessions** — JWT, HS256, 1-hour expiry, issuer/audience claims. Versioned tokens: changing/resetting the password revokes **every** session instantly.
- **FR-1.5 Password reset** — enumeration-safe forgot-password; reset code same rules as verification; successful reset bumps `token_version` and clears lockout state.
- **FR-1.6 Change password** — logged-in user must supply current password; a mismatch is counted against the same lockout tracker.
- **FR-1.7 Change email (with re-verification)** — user requests a change; a code is sent to the **new** address; the pending address is pinned to the code so it cannot be swapped for a different unverified inbox; confirm requires the code + matching address. The email only changes after confirmation.
- **FR-1.8 Profile management** — edit full name + biodata (phone, location, nationality, date of birth, education, experience, skills); avatar upload (PNG/JPG, 5 MB) with old-file cleanup.
- **FR-1.9 Deactivate / Reactivate / Delete** — deactivated accounts are confined to the account-management page; deletion requires prior deactivation, blocks deleting the last active admin, and **soft-deletes** the row (`is_deleted = 1`). All API responses treat a deleted account as "Account doesn't exist".
- **FR-1.10 Email reuse after deletion** — a soft-deleted account's address is immediately reusable: the unique constraint applies only to live accounts (`WHERE is_deleted = 0`).

#### FR-2 Roles (Job Postings)
- **FR-2.1 CRUD** — admins create/edit/close/delete roles (title, department, status open/closed, description).
- **FR-2.2 Listing** — any signed-in user lists roles; open roles drive the apply flow.

#### FR-3 Applications
- **FR-3.1 Apply** — one application per role per user (unique constraint, 409 on duplicate).
- **FR-3.2 Resume upload** — PDF/Word/TXT/image, 5 MB, stored server-side; URL surfaced to admins.
- **FR-3.3 Workflow** — statuses `In Review → Shortlisted → Rejected → Hired`; admin transitions; **Hired auto-promotes the applicant to `intern`**.
- **FR-3.4 Withdraw** — applicant may withdraw while "In Review"; admins receive an in-app notification.

#### FR-4 Interviews
- **FR-4.1 Scheduling** — **admins schedule interviews** (applicants cannot request; UI tells them the team schedules). Requires an application + date/time.
- **FR-4.2 Venue** — each interview carries a venue: **online** (optional meeting link) or **onsite** (optional address); rendered in lists and emails.
- **FR-4.3 Status** — Pending → Confirmed → Done, or Cancelled; the status transition may also update venue/details.
- **FR-4.4 Interviewers** — only admins may be assigned as interviewers (validated server-side).
- **FR-4.5 Visibility** — admins see all; applicants/interns see only their own; cancellation by the applicant is allowed (withdrawal of consent).
- **FR-4.6 Notifications & email** — scheduling, status changes, and venue inform the candidate via in-app notification + email.

#### FR-5 Offers & Negotiation
- **FR-5.1 Lifecycle** — Draft → Extended → (In Negotiation / Final) → Accepted → Confirmed / Declined.
- **FR-5.2 Revisions** — versioned terms (initial / counter / final / re-offer) with a superseding chain; only draft revisions are editable.
- **FR-5.3 Candidate actions** — view/extend, request changes, accept (optionally declining other offers), decline.
- **FR-5.4 Confirmation** — admin confirms a hire: promotes the user to intern and marks the application Hired.
- **FR-5.5 Messages** — per-offer admin↔candidate thread (chat line).

#### FR-6 Intern Management
- **FR-6.1 Directory** — admins list interns with role, offers count, task progress, onboarding progress, resume link, and a detail modal.
- **FR-6.2 Role conversion** — admin may change any user's role (applicant / intern / admin).
- **FR-6.3 Tasks** — admin assigns tasks (title, description, due date, status); interns update status; assignment notifies + emails.
- **FR-6.4 Onboarding checklist** — 5 default steps merged per-user; each step has an optional destination page (`href`) and a "How to complete" guide; interns or admins toggle completion; admin modal shows progress + guides.
- **FR-6.5 Required documents** — intern uploads CV/ID/certificates/other (5 MB, allowed types) on a dedicated `/intern/documents` page; view/download and delete (file removed from disk).
- **FR-6.6 Onboarding forms** — dedicated `/intern/forms` page pre-fills biodata and saves via the profile endpoint.

#### FR-7 Dashboard & Reporting
- **FR-7.1 Stats** — aggregate cards: total applications, open roles, pending interviews, offers extended; applications-by-department donut.
- **FR-7.2 Pipeline by role** — per-role breakdown of application statuses (In Review / Shortlisted / Rejected / Hired) with totals, ordered by role.
- **FR-7.3 Exports** — admin downloads **CSV** for applicants, interns, roles, and pipeline; **PDF** for the pipeline report (styled table).

#### FR-8 Notifications & Email
- **FR-8.1 In-app** — notifications table + `GET /notifications` (items + unread count), mark-read / read-all / dismiss; header bell polls every 15 s. Events: application status, withdrawal, interview schedule/status, offer extend/final/accept/decline/confirm, task assignment, account actions.
- **FR-8.2 Email** — branded HTML for verification, password reset, email-change, application status, offers, interviews (with venue), task assignment. Dev mirror logs codes to the console.

#### FR-9 File Handling & Transport
- **FR-9.1 Uploads** — avatar, resume, and intern documents via multer; 5 MB cap; extension allow-list; rejects are 400 (not 500).
- **FR-9.2 Text-packet transport** — files may be stored as Reed–Solomon data + parity fragments (`.txt` packets) for space-efficient storage and repair; admin upload + status + reconstruction endpoints.

### 3.2 Data Requirements (key entities)
`users` (role, verified, deactivated, deleted flags, biodata, avatar_url, token_version) · `roles` · `applications` (status, resume) · `interviews` (status, venue, venue_info, interviewer) · `offers` + `offer_revisions` + `offer_messages` · `intern_tasks` · `onboarding_steps` · `intern_documents` · `notifications` · `auth_tokens` (kind, hashed code, attempts, expiry, data) · `text_files` + `text_packets`.

Integrity rules: unique live email (partial index), unique username (case-insensitive), one application per role per user, one active interview per application, one onboarding row per (user, step).

### 3.3 External Interfaces
- **REST API** — JSON under `/api`; auth via `Authorization: Bearer <JWT>`.
- **File serving** — `/api/uploads/<uuid>.<ext>`.
- **SMTP** — outbound email (configurable; dev mirror logs).
- **Admin export** — `text/csv` / `application/pdf` with `Content-Disposition: attachment`.

### 3.4 Non-Functional Requirements

- **NFR-1 Security** — bcrypt password hashing; SHA-256 hashed email codes; versioned JWT revocation; per-username lockout; per-route rate limits; production CSP/HSTS/nosniff/referrer-policy + `no-store` API; `TRUST_PROXY` support; no secrets in client bundles.
- **NFR-2 Privacy** — soft-delete preserves audit history while the API treats deleted accounts as nonexistent; deleted-account emails are released for reuse.
- **NFR-3 Performance** — dashboard loads via parallel requests; lists return promptly at demo scale; notification bell polls every 15 s.
- **NFR-4 Reliability** — email is fire-and-forget (never blocks responses); transient network failures are retried client-side (≤ 2 retries, 15 s timeout).
- **NFR-5 Usability** — role-guarded navigation; onboarding steps guide the intern to the exact page with how-to text; empty states on all dashboards.
- **NFR-6 Maintainability** — Drizzle migrations for schema; ESLint-clean client; server modules split by domain (auth, roles, applications, interviews, offers, interns, dashboard, exports, documents, onboarding, notifications, text-files).

---

## 4. Verification Approach (demo)

| Requirement | How it's demonstrated |
|---|---|
| FR-1.1–1.10 Auth | Sign up → verify (code in server log) → login → change password → change email (code to new address) → confirm → deactivate → delete → re-signup with the freed email |
| FR-2/FR-3 | Admin creates a role → applicant applies with a resume → admin moves status → Hired auto-promotes to intern |
| FR-4 | Admin schedules an interview with venue (online link / onsite address) → applicant sees it + email with venue → admin confirms/assigns an admin interviewer |
| FR-5 | Admin extends an offer → candidate requests changes → counter → final → accept → admin confirms hire |
| FR-6 | Intern dashboard: onboarding checklist with guides → upload documents → complete forms → task board |
| FR-7 | Admin dashboard: stat cards, pipeline table → export pipeline CSV + PDF, plus applicants/interns/roles CSV |
| FR-8 | Bell notifications + emails across status/offer/interview/task events |

---

## 5. Known Gaps (post-demo roadmap)
- Audit log (tamper-evident trail)
- Search / filter / pagination across admin lists
- 2FA / TOTP
- httpOnly refresh-token rotation
- Persistent (disk-backed) lockout tracking
- Candidate-initiated interview requests → notify admins by email
- Soft "Withdrawn" status (today withdrawal removes the row once past Shortlisted)

---

*This SRS reflects the system as built for the 2026-08-20 demo. It supersedes the stale `FEATURES.md` inventory.*