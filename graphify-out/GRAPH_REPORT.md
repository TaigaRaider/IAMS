# Graph Report - IAMS  (2026-08-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 362 nodes · 815 edges · 20 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `360c38b9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.routes.js
- api
- AdminDashboard.jsx
- devDependencies
- dependencies
- client/package.json
- server/package.json
- `applications`
- email-templates.js
- tokens.js
- IntroPage.jsx
- seed-journal.mjs

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
- `AssignTaskForm()` --calls--> `api()`  [EXTRACTED]
  client/src/screens/AdminTasksPage.jsx → client/src/api.js
- `isUniqueViolation()` --calls--> `compare()`  [EXTRACTED]
  server/src/routes/auth.routes.js → server/src/utils/compare.js
- `isUniqueViolation()` --calls--> `compare()`  [EXTRACTED]
  server/src/routes/offers.routes.js → server/src/utils/compare.js
- `issueAndSend()` --calls--> `sendMail()`  [EXTRACTED]
  server/src/routes/auth.routes.js → server/src/utils/mailer.js
- `InterviewPage()` --calls--> `compare()`  [EXTRACTED]
  client/src/components/InterviewPage.jsx → client/src/utils/compare.js

## Import Cycles
- None detected.

## Communities (20 total, 0 thin omitted)

### Community 0 - "auth.routes.js"
Cohesion: 0.06
Nodes (56): client, db, __dirname, applications, internTasks, interviews, notifications, offerMessages (+48 more)

### Community 1 - "api"
Cohesion: 0.08
Nodes (44): api(), getSession(), isTransient(), logout(), saveSession(), sleep(), App(), AcceptOfferDialog() (+36 more)

### Community 2 - "AdminDashboard.jsx"
Cohesion: 0.07
Nodes (44): ConfirmHireDialog(), DeptDoughnut(), PALETTE, EmptyState(), ACTIVE_STATUSES, AdminInterviews(), ApplicantInterviews(), formatDateTime() (+36 more)

### Community 3 - "devDependencies"
Cohesion: 0.08
Nodes (25): @babel/core, babel-plugin-react-compiler, devDependencies, @babel/core, babel-plugin-react-compiler, eslint, @eslint/js, eslint-plugin-react-hooks (+17 more)

### Community 4 - "dependencies"
Cohesion: 0.09
Nodes (23): bcryptjs, cookie-parser, cors, dotenv, drizzle-orm, express, express-rate-limit, helmet (+15 more)

### Community 5 - "client/package.json"
Cohesion: 0.09
Nodes (22): chart.js, dependencies, chart.js, lucide-react, react, react-dom, react-icons, react-router-dom (+14 more)

### Community 6 - "server/package.json"
Cohesion: 0.10
Nodes (19): drizzle-kit, nodemon, allowScripts, esbuild@0.25.12, author, description, devDependencies, drizzle-kit (+11 more)

### Community 7 - "`applications`"
Cohesion: 0.19
Nodes (11): `applications`, `interviews`, `offers`, `roles`, `users`, `intern_tasks`, `__new_offers`, `offer_messages` (+3 more)

### Community 8 - "email-templates.js"
Cohesion: 0.42
Nodes (11): issueAndSend(), applicationStatusEmail(), codeBlock(), detailRow(), detailsTable(), interviewEmail(), offerEmail(), resetEmail() (+3 more)

### Community 9 - "tokens.js"
Cohesion: 0.25
Nodes (10): authTokens, CODE_TTL_MS, consumeCode(), cooldownRemaining(), generateCode(), hashCode(), issueCode(), MAX_CODE_ATTEMPTS (+2 more)

### Community 10 - "IntroPage.jsx"
Cohesion: 0.40
Nodes (5): initials(), INTERNS, IntroPage(), PHOTO_GRADIENTS, TECH_ICONS

### Community 11 - "seed-journal.mjs"
Cohesion: 0.50
Nodes (3): c, entries, journal

## Knowledge Gaps
- **98 isolated node(s):** `client`, `__dirname`, `apiLimiter`, `app`, `codeLimiter` (+93 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `api` to `AdminDashboard.jsx`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `logout()` connect `api` to `AdminDashboard.jsx`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `client/package.json`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `client`, `__dirname`, `apiLimiter` to the rest of the system?**
  _98 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `auth.routes.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06368330464716007 - nodes in this community are weakly interconnected._
- **Should `api` be split into smaller, more focused modules?**
  _Cohesion score 0.08367254635911352 - nodes in this community are weakly interconnected._
- **Should `AdminDashboard.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07117255504352278 - nodes in this community are weakly interconnected._