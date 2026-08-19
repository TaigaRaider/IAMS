# Graph Report - IAMS  (2026-08-19)

## Corpus Check
- 105 files · ~147,623 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 542 nodes · 1059 edges · 31 communities (28 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2243a45d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- offers.routes.js
- AdminApplicantsPage.jsx
- api
- devDependencies
- dependencies
- client/package.json
- Connecting the Frontend to the Backend
- `users`
- seed-journal.mjs
- 4. Endpoint reference
- textfiles.routes.js
- IntroPage.jsx
- IAMS — Feature Inventory
- auth.routes.js
- IAMS Security Documentation
- DeptDoughnut.jsx
- React + Vite
- opencode.json
- graphify.js
- 0011_burly_black_cat.sql
- AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `api()` - 53 edges
2. `logout()` - 40 edges
3. `compare()` - 29 edges
4. `getSession()` - 18 edges
5. `db` - 15 edges
6. `compare()` - 15 edges
7. `verifyAuth()` - 13 edges
8. `IAMS — Feature Inventory` - 12 edges
9. `EmptyState()` - 10 edges
10. `users` - 10 edges

## Surprising Connections (you probably didn't know these)
- `isUniqueViolation()` --calls--> `compare()`  [EXTRACTED]
  server/src/routes/auth.routes.js → server/src/utils/compare.js
- `ApplicantsPage()` --calls--> `api()`  [EXTRACTED]
  client/src/screens/AdminApplicantsPage.jsx → client/src/api.js
- `AssignTaskForm()` --calls--> `api()`  [EXTRACTED]
  client/src/screens/AdminTasksPage.jsx → client/src/api.js
- `ApplicantsPage()` --calls--> `logout()`  [EXTRACTED]
  client/src/screens/AdminApplicantsPage.jsx → client/src/api.js
- `ActionBar()` --calls--> `compare()`  [EXTRACTED]
  client/src/screens/AdminOfferDetail.jsx → client/src/utils/compare.js

## Import Cycles
- None detected.

## Communities (31 total, 3 thin omitted)

### Community 0 - "offers.routes.js"
Cohesion: 0.07
Nodes (55): client, db, __dirname, applications, internTasks, interviews, notifications, offerMessages (+47 more)

### Community 1 - "AdminApplicantsPage.jsx"
Cohesion: 0.53
Nodes (5): ApplicantsPage(), formatDate(), initials(), statusClass(), STATUSES

### Community 2 - "api"
Cohesion: 0.05
Nodes (82): api(), getSession(), isTransient(), logout(), saveSession(), sleep(), App(), AcceptOfferDialog() (+74 more)

### Community 3 - "devDependencies"
Cohesion: 0.08
Nodes (25): @babel/core, babel-plugin-react-compiler, devDependencies, @babel/core, babel-plugin-react-compiler, eslint, @eslint/js, eslint-plugin-react-hooks (+17 more)

### Community 4 - "dependencies"
Cohesion: 0.04
Nodes (45): bcryptjs, cookie-parser, cors, dotenv, drizzle-kit, drizzle-orm, express, express-rate-limit (+37 more)

### Community 5 - "client/package.json"
Cohesion: 0.09
Nodes (22): chart.js, dependencies, chart.js, lucide-react, react, react-dom, react-icons, react-router-dom (+14 more)

### Community 6 - "Connecting the Frontend to the Backend"
Cohesion: 0.06
Nodes (34): 1. Setup facts, 2. Shared fetch helper — `client/src/api.js`, 3. Login page — `client/src/components/LoginForm.jsx`, 4. Signup page — `client/src/components/SignUpForm.jsx`, 5. Admin pages, 6. Applicant page — `client/src/screens/ApplicantPage.jsx`, 7. App.jsx — missing applicant route, 8. Common gotchas (+26 more)

### Community 7 - "`users`"
Cohesion: 0.16
Nodes (12): `applications`, `interviews`, `offers`, `roles`, `users`, `intern_tasks`, `__new_offers`, `offer_messages` (+4 more)

### Community 11 - "seed-journal.mjs"
Cohesion: 0.50
Nodes (3): c, entries, journal

### Community 20 - "4. Endpoint reference"
Cohesion: 0.06
Nodes (35): 4. Endpoint reference, Account management (deactivation / deletion), Applications, Auth, Dashboard, `DELETE /api/auth/account` — Token, `DELETE /api/interns/tasks/:id` — Token (admin), `GET /api/applications` — Token (+27 more)

### Community 21 - "textfiles.routes.js"
Cohesion: 0.10
Nodes (19): textFiles, textPackets, textFilesRouter, [command, arg1, arg2], decodeFile(), encodeFile(), base64ToBytes(), BLOCK_CAP (+11 more)

### Community 24 - "IntroPage.jsx"
Cohesion: 0.40
Nodes (5): initials(), INTERNS, IntroPage(), PHOTO_GRADIENTS, TECH_ICONS

### Community 25 - "IAMS — Feature Inventory"
Cohesion: 0.15
Nodes (12): 10. Deferred / Not Started, 1. Authentication & Accounts, 2. Roles (job postings), 3. Applications, 4. Interviews, 5. Offers & Negotiation, 6. Intern Management, 7. Dashboard & Reporting (+4 more)

### Community 27 - "auth.routes.js"
Cohesion: 0.07
Nodes (41): authTokens, TOKEN_ALGORITHM, TOKEN_AUDIENCE, TOKEN_ISSUER, removeStoredFile(), authRouter, cleanEmail(), DUMMY_HASH (+33 more)

### Community 28 - "IAMS Security Documentation"
Cohesion: 0.20
Nodes (9): 1. Threat model, 2. Controls and how they map to the threats, 3. Authentication flow (as implemented), 4. Server configuration (`server/.env`), 5. Client-side posture, 6. Testing the controls, 7. Known limitations / future work, Applicant → intern migration (+1 more)

### Community 30 - "DeptDoughnut.jsx"
Cohesion: 0.60
Nodes (4): DeptDoughnut(), mix(), PALETTE, toRgb()

### Community 31 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 32 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

## Knowledge Gaps
- **188 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `name`, `private`, `version` (+183 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `api` to `AdminApplicantsPage.jsx`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `4. Endpoint reference` connect `4. Endpoint reference` to `Connecting the Frontend to the Backend`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `IAMS HTTP Request Handling & REST API` connect `Connecting the Frontend to the Backend` to `4. Endpoint reference`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `name` to the rest of the system?**
  _188 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `offers.routes.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0680379746835443 - nodes in this community are weakly interconnected._
- **Should `api` be split into smaller, more focused modules?**
  _Cohesion score 0.05251232840197254 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._