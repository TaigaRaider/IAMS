# Graph Report - IAMS  (2026-08-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 342 nodes · 792 edges · 23 communities (22 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `360c38b9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.routes.js
- App.jsx
- devDependencies
- dependencies
- client/package.json
- server/package.json
- api
- AdminDashboard.jsx
- InternDashboard.jsx
- AdminRolesPage.jsx
- email-templates.js
- tokens.js
- compare
- AdminOffersPage.jsx
- InterviewPage.jsx
- NotificationBell.jsx
- AdminApplicantsPage.jsx
- seed-journal.mjs
- DeptDoughnut.jsx

## God Nodes (most connected - your core abstractions)
1. `api()` - 51 edges
2. `logout()` - 38 edges
3. `compare()` - 29 edges
4. `getSession()` - 18 edges
5. `compare()` - 14 edges
6. `db` - 12 edges
7. `verifyAuth()` - 11 edges
8. `EmptyState()` - 10 edges
9. `saveSession()` - 9 edges
10. `SearchResults()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `ActionBar()` --calls--> `compare()`  [EXTRACTED]
  client/src/screens/AdminOfferDetail.jsx → client/src/utils/compare.js
- `OfferRowActions()` --calls--> `compare()`  [EXTRACTED]
  client/src/screens/AdminOffersPage.jsx → client/src/utils/compare.js
- `isUniqueViolation()` --calls--> `compare()`  [EXTRACTED]
  server/src/routes/auth.routes.js → server/src/utils/compare.js
- `isUniqueViolation()` --calls--> `compare()`  [EXTRACTED]
  server/src/routes/offers.routes.js → server/src/utils/compare.js
- `issueAndSend()` --calls--> `sendMail()`  [EXTRACTED]
  server/src/routes/auth.routes.js → server/src/utils/mailer.js

## Import Cycles
- None detected.

## Communities (23 total, 1 thin omitted)

### Community 0 - "auth.routes.js"
Cohesion: 0.06
Nodes (56): client, db, __dirname, applications, internTasks, interviews, notifications, offerMessages (+48 more)

### Community 1 - "App.jsx"
Cohesion: 0.10
Nodes (22): saveSession(), App(), AccountStatus(), HOME_BY_ROLE, ApplicantDashboard(), AuthForm(), goHome(), HOME_BY_ROLE (+14 more)

### Community 2 - "devDependencies"
Cohesion: 0.08
Nodes (25): @babel/core, babel-plugin-react-compiler, devDependencies, @babel/core, babel-plugin-react-compiler, eslint, @eslint/js, eslint-plugin-react-hooks (+17 more)

### Community 3 - "dependencies"
Cohesion: 0.09
Nodes (23): bcryptjs, cookie-parser, cors, dotenv, drizzle-orm, express, express-rate-limit, helmet (+15 more)

### Community 4 - "client/package.json"
Cohesion: 0.09
Nodes (22): chart.js, dependencies, chart.js, lucide-react, react, react-dom, react-icons, react-router-dom (+14 more)

### Community 5 - "server/package.json"
Cohesion: 0.10
Nodes (19): drizzle-kit, nodemon, allowScripts, esbuild@0.25.12, author, description, devDependencies, drizzle-kit (+11 more)

### Community 6 - "api"
Cohesion: 0.26
Nodes (14): api(), getSession(), isTransient(), logout(), sleep(), AddRoleForm(), ProfilePage(), Overview() (+6 more)

### Community 7 - "AdminDashboard.jsx"
Cohesion: 0.19
Nodes (8): InterviewPage(), MODE_META, OfferComposer(), ADMIN_NAV, AdminOfferComposerPage(), ActionBar(), AdminOfferDetail(), KIND_LABEL

### Community 8 - "InternDashboard.jsx"
Cohesion: 0.24
Nodes (8): APPLICANT_NAV, DashboardShell(), CONTACTS, formatDate(), INTERN_NAV, InternOverview(), matches(), SearchResults()

### Community 9 - "AdminRolesPage.jsx"
Cohesion: 0.26
Nodes (8): EmptyState(), OverviewSkeleton(), Skeleton(), TableSkeleton(), AdminRolesPage(), applicantStatusClass(), roleStatusClass(), ApplicantOffersPage()

### Community 10 - "email-templates.js"
Cohesion: 0.42
Nodes (11): issueAndSend(), applicationStatusEmail(), codeBlock(), detailRow(), detailsTable(), interviewEmail(), offerEmail(), resetEmail() (+3 more)

### Community 11 - "tokens.js"
Cohesion: 0.25
Nodes (10): authTokens, CODE_TTL_MS, consumeCode(), cooldownRemaining(), generateCode(), hashCode(), issueCode(), MAX_CODE_ATTEMPTS (+2 more)

### Community 12 - "compare"
Cohesion: 0.38
Nodes (6): AcceptOfferDialog(), OfferCard(), ApplicantPage(), STATUS_INFO, statusClass(), compare()

### Community 13 - "AdminOffersPage.jsx"
Cohesion: 0.27
Nodes (8): ConfirmHireDialog(), AdminOffersPage(), COMPLETED_STATUSES, initials(), OfferRoles(), OfferRowActions(), OffersList(), STATUS_CLASS

### Community 14 - "InterviewPage.jsx"
Cohesion: 0.43
Nodes (7): ACTIVE_STATUSES, AdminInterviews(), ApplicantInterviews(), formatDateTime(), initials(), STATUS_META, useUnauthorized()

### Community 15 - "NotificationBell.jsx"
Cohesion: 0.47
Nodes (5): DEFAULT_META, KIND_META, navigateTo(), NotificationBell(), timeAgo()

### Community 16 - "AdminApplicantsPage.jsx"
Cohesion: 0.53
Nodes (5): ApplicantsPage(), formatDate(), initials(), statusClass(), STATUSES

### Community 17 - "seed-journal.mjs"
Cohesion: 0.50
Nodes (3): c, entries, journal

## Knowledge Gaps
- **98 isolated node(s):** `client`, `__dirname`, `apiLimiter`, `app`, `codeLimiter` (+93 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `api` to `App.jsx`, `AdminDashboard.jsx`, `InternDashboard.jsx`, `AdminRolesPage.jsx`, `compare`, `AdminOffersPage.jsx`, `InterviewPage.jsx`, `NotificationBell.jsx`, `AdminApplicantsPage.jsx`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `logout()` connect `api` to `App.jsx`, `AdminDashboard.jsx`, `InternDashboard.jsx`, `AdminRolesPage.jsx`, `compare`, `AdminOffersPage.jsx`, `InterviewPage.jsx`, `AdminApplicantsPage.jsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `client/package.json`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `client`, `__dirname`, `apiLimiter` to the rest of the system?**
  _98 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `auth.routes.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06368330464716007 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09848484848484848 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._