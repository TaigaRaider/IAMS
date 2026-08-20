# Graph Report - IAMS  (2026-08-20)

## Corpus Check
- 125 files · ~163,047 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 602 nodes · 1213 edges · 47 communities (44 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d8da9d90`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.middleware.js
- AdminDashboard.jsx
- compare
- devDependencies
- dependencies
- AdminOffersPage.jsx
- Connecting the Frontend to the Backend
- `users`
- api
- applications.routes.js
- seed-journal.mjs
- 4. Endpoint reference
- textfiles.routes.js
- offers.routes.js
- index.js
- IntroPage.jsx
- IAMS — Feature Inventory
- schema.js
- auth.routes.js
- IAMS Security Documentation
- InternDashboard.jsx
- DeptDoughnut.jsx
- React + Vite
- opencode.json
- graphify.js
- 0011_burly_black_cat.sql
- AGENTS.md
- App.jsx
- interviews.routes.js
- NotificationBell.jsx
- InternDocumentsPage.jsx
- delete-user.mjs
- JourneyTimeline.jsx
- OnboardingTour.jsx

## God Nodes (most connected - your core abstractions)
1. `api()` - 57 edges
2. `logout()` - 44 edges
3. `compare()` - 30 edges
4. `getSession()` - 19 edges
5. `db` - 17 edges
6. `compare()` - 16 edges
7. `verifyAuth()` - 15 edges
8. `requireAdmin()` - 12 edges
9. `IAMS — Feature Inventory` - 12 edges
10. `useToast()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `AssignTaskForm()` --calls--> `api()`  [EXTRACTED]
  client/src/screens/AdminTasksPage.jsx → client/src/api.js
- `OfferRowActions()` --calls--> `compare()`  [EXTRACTED]
  client/src/screens/AdminOffersPage.jsx → client/src/utils/compare.js
- `isUniqueViolation()` --calls--> `compare()`  [EXTRACTED]
  server/src/routes/auth.routes.js → server/src/utils/compare.js
- `isUniqueViolation()` --calls--> `compare()`  [EXTRACTED]
  server/src/routes/offers.routes.js → server/src/utils/compare.js
- `InternOverview()` --calls--> `api()`  [EXTRACTED]
  client/src/components/InternDashboard.jsx → client/src/api.js

## Import Cycles
- None detected.

## Communities (47 total, 3 thin omitted)

### Community 0 - "auth.middleware.js"
Cohesion: 0.20
Nodes (16): client, db, __dirname, internTasks, onboardingSteps, users, extractToken(), requireAdmin() (+8 more)

### Community 1 - "AdminDashboard.jsx"
Cohesion: 0.14
Nodes (19): downloadFile(), isTransient(), sleep(), EmptyState(), ExportButton(), ApplicantsPage(), formatDate(), initials() (+11 more)

### Community 2 - "compare"
Cohesion: 0.14
Nodes (21): AdminInterviews(), ApplicantInterviews(), formatDateTime(), initials(), InterviewPage(), STATUS_META, useUnauthorized(), VenueBadge() (+13 more)

### Community 3 - "devDependencies"
Cohesion: 0.04
Nodes (47): @babel/core, babel-plugin-react-compiler, chart.js, dependencies, chart.js, lucide-react, react, react-dom (+39 more)

### Community 4 - "dependencies"
Cohesion: 0.04
Nodes (47): bcryptjs, cookie-parser, cors, dotenv, drizzle-kit, drizzle-orm, express, express-rate-limit (+39 more)

### Community 5 - "AdminOffersPage.jsx"
Cohesion: 0.12
Nodes (21): AcceptOfferDialog(), ConfirmHireDialog(), OfferCard(), ToastContext, useToast(), ICONS, ToastProvider(), AdminOfferDetail() (+13 more)

### Community 6 - "Connecting the Frontend to the Backend"
Cohesion: 0.06
Nodes (34): 1. Setup facts, 2. Shared fetch helper — `client/src/api.js`, 3. Login page — `client/src/components/LoginForm.jsx`, 4. Signup page — `client/src/components/SignUpForm.jsx`, 5. Admin pages, 6. Applicant page — `client/src/screens/ApplicantPage.jsx`, 7. App.jsx — missing applicant route, 8. Common gotchas (+26 more)

### Community 7 - "`users`"
Cohesion: 0.14
Nodes (13): `applications`, `interviews`, `offers`, `roles`, `users`, `intern_tasks`, `__new_offers`, `offer_messages` (+5 more)

### Community 9 - "api"
Cohesion: 0.20
Nodes (19): api(), getSession(), logout(), saveSession(), AccountStatus(), HOME_BY_ROLE, AddRoleForm(), AuthForm() (+11 more)

### Community 10 - "applications.routes.js"
Cohesion: 0.14
Nodes (15): internDocuments, applicationSelect, BIODATA_FIELDS, removeStoredFile(), DOC_TYPES, documentRouter, ALLOWED_EXTENSIONS, __dirname (+7 more)

### Community 11 - "seed-journal.mjs"
Cohesion: 0.50
Nodes (3): c, entries, journal

### Community 20 - "4. Endpoint reference"
Cohesion: 0.06
Nodes (35): 4. Endpoint reference, Account management (deactivation / deletion), Applications, Auth, Dashboard, `DELETE /api/auth/account` — Token, `DELETE /api/interns/tasks/:id` — Token (admin), `GET /api/applications` — Token (+27 more)

### Community 21 - "textfiles.routes.js"
Cohesion: 0.11
Nodes (18): textFiles, textPackets, textFilesRouter, [command, arg1, arg2], decodeFile(), encodeFile(), base64ToBytes(), BLOCK_CAP (+10 more)

### Community 22 - "offers.routes.js"
Cohesion: 0.13
Nodes (13): notifications, offerMessages, offerRevisions, declineOffers(), insertRevision(), isUniqueViolation(), nextVersion(), offerRouter (+5 more)

### Community 23 - "index.js"
Cohesion: 0.11
Nodes (17): apiLimiter, app, CLIENT_DIST, CLIENT_INDEX, codeLimiter, __dirname, hasClientBuild, loginLimiter (+9 more)

### Community 24 - "IntroPage.jsx"
Cohesion: 0.40
Nodes (5): initials(), INTERNS, IntroPage(), PHOTO_GRADIENTS, TECH_ICONS

### Community 25 - "IAMS — Feature Inventory"
Cohesion: 0.15
Nodes (12): 10. Deferred / Not Started, 1. Authentication & Accounts, 2. Roles (job postings), 3. Applications, 4. Interviews, 5. Offers & Negotiation, 6. Intern Management, 7. Dashboard & Reporting (+4 more)

### Community 26 - "schema.js"
Cohesion: 0.18
Nodes (8): applications, interviews, offers, roles, csvCell(), exportRouter, PIPELINE_STATUSES, toCsv()

### Community 27 - "auth.routes.js"
Cohesion: 0.10
Nodes (30): authTokens, TOKEN_ALGORITHM, TOKEN_AUDIENCE, TOKEN_ISSUER, cleanEmail(), DUMMY_HASH, failedAttempts, findByEmail() (+22 more)

### Community 28 - "IAMS Security Documentation"
Cohesion: 0.20
Nodes (9): 1. Threat model, 2. Controls and how they map to the threats, 3. Authentication flow (as implemented), 4. Server configuration (`server/.env`), 5. Client-side posture, 6. Testing the controls, 7. Known limitations / future work, Applicant → intern migration (+1 more)

### Community 29 - "InternDashboard.jsx"
Cohesion: 0.18
Nodes (11): APPLICANT_NAV, ApplicantDashboard(), DashboardShell(), CONTACTS, DEFAULT_ONBOARDING_STEPS, formatDate(), INTERN_NAV, InternDashboard() (+3 more)

### Community 30 - "DeptDoughnut.jsx"
Cohesion: 0.60
Nodes (4): DeptDoughnut(), mix(), PALETTE, toRgb()

### Community 31 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 32 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 37 - "App.jsx"
Cohesion: 0.30
Nodes (5): App(), BrandSide(), AuthPage(), ResetPasswordPage(), VerifyPage()

### Community 38 - "interviews.routes.js"
Cohesion: 0.32
Nodes (6): ACTIVE_STATUSES, interviewers, interviewRouter, interviewSelect, getTransport(), sendMail()

### Community 39 - "NotificationBell.jsx"
Cohesion: 0.47
Nodes (5): DEFAULT_META, KIND_META, navigateTo(), NotificationBell(), timeAgo()

### Community 40 - "InternDocumentsPage.jsx"
Cohesion: 0.60
Nodes (4): DOC_TYPE_META, formatBytes(), formatDate(), InternDocumentsPage()

### Community 41 - "delete-user.mjs"
Cohesion: 0.40
Nodes (3): appIds, client, __dirname

### Community 42 - "JourneyTimeline.jsx"
Cohesion: 0.50
Nodes (3): JourneyTimeline(), OFFER_ACTIVE, OFFER_DONE

### Community 43 - "OnboardingTour.jsx"
Cohesion: 0.67
Nodes (3): OnboardingTour(), TOUR_KEY(), TOURS

## Knowledge Gaps
- **202 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `name`, `private`, `version` (+197 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `api` to `AdminDashboard.jsx`, `compare`, `AdminOffersPage.jsx`, `App.jsx`, `NotificationBell.jsx`, `InternDocumentsPage.jsx`, `InternDashboard.jsx`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `4. Endpoint reference` connect `4. Endpoint reference` to `Connecting the Frontend to the Backend`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `IAMS HTTP Request Handling & REST API` connect `Connecting the Frontend to the Backend` to `4. Endpoint reference`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `name` to the rest of the system?**
  _202 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AdminDashboard.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13793103448275862 - nodes in this community are weakly interconnected._
- **Should `compare` be split into smaller, more focused modules?**
  _Cohesion score 0.1350806451612903 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._