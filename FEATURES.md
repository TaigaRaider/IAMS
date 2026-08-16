# IAMS — Feature Inventory

Internship Application Management System. Stack: React (Vite) client + Express server, Turso (SQLite) via Drizzle. This file is the product's feature map: what exists, what's planned, what's missing.

Legend: `[x] built` · `[~] partial / known gaps` · `[ ] missing`

---

## 1. Authentication & Accounts

- `[x]` **Signup** — full name / email / username / password (bcrypt cost 12, letter+number rule, min 8 chars)
- `[x]` **Email verification** — 6-digit code, single-use, 30 min expiry, hashed at rest, 5-attempt cap, resend cooldown
- `[x]` **Login** — per-username lockout (15 fails → 60s), IP rate limit, time-equalized for missing accounts (no enumeration by timing)
- `[x]` **Session (JWT)** — HS256, issuer/audience, 1h expiry; versioned tokens: password change/reset revoke every session instantly
- `[x]` **Forgot / reset password** — enumeration-safe response, reset kills all sessions
- `[x]` **Change password** (logged in) — requires current password; mismatch counts against lockout
- `[x]` **Deactivate / Reactivate / Delete account** — soft delete (is_deleted), final-admin protection, deactivated accounts confined to account management
- `[x]` **Edit profile (name)** — persisted via `PATCH /auth/account/profile`; client save no longer simulated
- `[ ]` **Change email** — no flow (re-verify new address)

## 2. Roles (job postings)

- `[x]` **Role CRUD** — admin creates/edits/closes/deletes roles (title, department, status, description)
- `[x]` **Public-ish listing** — any signed-in user can list open roles

## 3. Applications

- `[x]` **Apply to role** — one application per role (unique constraint, 409 if dup)
- `[x]` **My applications** — per-user list; admin sees all
- `[x]` **Status workflow** — In Review → Shortlisted → Rejected → Hired; Hired auto-promotes role to intern
- `[x]` **Withdraw application** — applicant can withdraw while still In Review; admins get a notification
- `[ ]` **Withdrawn status (soft)** — withdrawal currently hard-deletes the row (blocked once Shortlisted)

## 4. Interviews

- `[x]` **Request interview** — applicant requests on own application; admin can create on behalf
- `[x]` **Admin tools** — assignment of any user as interviewer, status transitions (Pending/Confirmed/Done/Cancelled), reschedule
- `[x]` **Visibility** — admin sees all; others see their own

## 5. Offers & Negotiation

- `[x]` **Offer lifecycle** — Draft → Extended → (In Negotiation / Final) → Accepted → Confirmed / Declined
- `[x]` **Revisions** — versioned terms (initial/counter/final/reoffer), superseding chain; only drafts editable
- `[x]` **Candidate actions** — view/extend, request changes, accept (optional decline-others), decline; admin counter & final
- `[x]` **Confirm hires** — admin confirmation promotes the applicant to intern and marks the application Hired
- `[x]` **Offer messages** — admin/candidate thread per offer (chat communication line)

## 6. Intern Management

- `[x]` **Intern directory** — admin lists interns with their stats
- `[x]` **Employee conversion** — admin can set any user's role (applicant/intern/admin)
- `[x]` **Task board** — admin assigns tasks (title, description, due date, status); intern updates status

## 7. Dashboard & Reporting

- `[x]` **Admin stats** — one aggregate endpoint (`/dashboard/stats`)
- `[ ]` **Per-role pipeline** — application funnel per posting
- `[ ]` **Search / filter / pagination** — all admin lists return everything unfiltered
- `[ ]` **Exports** — no CSV/PDF anywhere

## 8. Notifications & Email

- `[x]` **In-app notifications** — `notifications` table, `GET /notifications` (items + unread count), mark-read / read-all / dismiss; bell in the header polls every 15s; events wired across application status, withdrawal, interview schedule/status, offer extend/final/accept/decline/confirm, task assignment, and account actions
- `[x]` **Auth emails** — verification & password reset (branded HTML, fire-and-forget, dev mirror in log)
- `[x]` **Domain emails** — status changes, offers (extended / confirmed), interview scheduling/status, and task assignment now email the affected user
- `[ ]` Candidate-initiated interview request → no admin email (in-app-only today)

## 9. Security Hardening

- `[x]` Token revocation (versioned JWTs) — password change/reset kill every session instantly
- `[x]` Login — per-username lockout, timing-equalized (no enumeration), per-route rate limits, email codes hashed at rest + cooldowns
- `[x]` Headers — production CSP + HSTS + nosniff + referrer policy + `no-store` API; `TRUST_PROXY` support for real client IPs
- `[x]` Audit log — not built yet (see below)

## 10. Deferred / Not Started

- `[ ]` **Audit log** — who did what (password reset, delete, role change...), tamper-evident trail
- `[ ]` **Email change** with re-verification
- `[ ]` **Resume / attachment upload** — no file handling in the stack
- `[ ]` **Admin user directory** — only role-change-by-id exists, no full user list UI
- `[ ]` **2FA / TOTP**
- `[ ]` **httpOnly refresh-token flow** (JWTs currently live in sessionStorage)
- `[ ]` **Persistence for login lockout** (in-memory map today, lost on restart)

---

## Recent Work

- **2026-08-16** — Session revocation (versioned JWTs); login timing equalization; prod CSP/headers + `TRUST_PROXY`; change-password endpoint + UI
- **2026-08-16** — Profile edit persisted; notifications (table + API + header bell); domain emails (status/offer/interview/task); application withdrawal with admin notification

---

*Last updated: 2026-08-16*