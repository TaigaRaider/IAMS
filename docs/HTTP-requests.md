# IAMS HTTP Request Handling & REST API

Reference spec for how the IAMS server handles HTTP requests: conventions, route
layout, authentication, and every endpoint the API exposes.

---

## 1. Conventions

### Base URL

```
http://localhost:8580/api
```

The server runs on the port set in `server/.env` (`PORT`), with CORS locked to
the origin in `server/.env` (`ORIGIN`).

### JSON response shape

Every endpoint returns JSON in one of two shapes:

**Success**

```json
{
  "data": { "...": "..." }
}
```

**Failure**

```json
{
  "error": "human readable message"
}
```

### Status codes

| Code | Meaning                                          |
| ---- | ------------------------------------------------ |
| 200  | OK — request succeeded                           |
| 201  | Created — a resource was inserted                |
| 400  | Bad request — missing/invalid fields             |
| 401  | Unauthorized — missing/invalid token or credentials |
| 403  | Forbidden — valid token, but role lacks permission |
| 404  | Not found — route or resource doesn't exist      |
| 409  | Conflict — duplicate unique value (email, username, application) |
| 429  | Too many requests — rate limit or account lockout active |
| 500  | Server error — unexpected failure                |

### SQL rule

**Never** build SQL by concatenating user input. Always use prepared,
parameterized statements:

```js
db.prepare("INSERT INTO users (email) VALUES (?)").run(email);
```

---

## 2. Route layout

Route modules live in `server/src/routes/` and are mounted under `/api` in
`server/src/index.js`:

```
src/
  db.js
  middleware/
    auth.middleware.js     verifyAuth, requireAdmin
  routes/
    auth.routes.js          POST /api/auth/signup, POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout
    roles.routes.js         GET/POST /api/roles, PATCH /api/roles/:id
    applications.routes.js  GET/POST /api/applications, PATCH /api/applications/:id/status
    interviews.routes.js    GET/POST /api/interviews
    offers.routes.js        GET/POST /api/offers, POST /api/offers/:id/accept, PATCH /api/offers/:id/status
    interns.routes.js       GET /api/interns, GET/POST/PATCH/DELETE /api/interns/tasks, PATCH /api/interns/users/:id/role
    dashboard.routes.js     GET /api/dashboard/stats
```

Each module exports an Express `Router`:

```js
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => { /* ... */ });

export default router;
```

`index.js` mounts them:

```js
import authRoutes from "./routes/auth.routes.js";

app.use("/api/auth", authRoutes);
```

`index.js` keeps only the global middleware: `helmet`, `cookieParser`, `cors`,
`express.json({ limit: "10kb" })`, the rate limiters (login/signup/api), the 404
handler, and the error handler.

---

## 3. JWT authentication

### What a JWT is

A **JSON Web Token** is a compact, signed string the server issues after login.
It has three parts, each base64-encoded and joined by dots:

```
<header>.<payload>.<signature>
```

- **Header** — algorithm + token type: `{"alg": "HS256", "typ": "JWT"}`
- **Payload** — claims (data about the user): `{"sub": 5, "role": "applicant", "iat": 1754550000, "exp": 1754636400}` (`sub` = user id, `iat` = issued at, `exp` = expiry)
- **Signature** — hash of `header.payload` using a secret kept on the server. This is what makes the token unforgeable: if anyone edits the payload, the signature no longer matches and verification fails.

Verification is pinned to `HS256` (no algorithm confusion), and the token must
carry issuer `iams` and audience `iams-client` or it is rejected.

### The flow (logic)

1. **Signup** — client sends `full_name`, `email`, `username`, `password`.
   The server validates each field (see §5 "Auth validation rules"),
   hashes the password with `bcryptjs` at 12 rounds (never stores plaintext),
   inserts the user, returns `201`.
2. **Login** — client sends `username`, `password`. Server looks up the user,
   compares the password hash with `bcrypt.compare()`. On success it signs a
   JWT (`jsonwebtoken.sign`) containing the user id, role, issuer, and
   audience — **and sets it as an `HttpOnly` cookie** (`iams_token`) rather
   than returning it in the body:
   ```json
   { "data": { "role": "applicant", "full_name": "Anomalous" } }
   ```

   Cookie flags: `HttpOnly` (JS cannot read it → XSS can't steal it),
   `SameSite=Strict` (CSRF-resistant), `Secure` when `NODE_ENV=production`,
   `Max-Age` from `JWT_EXPIRES_IN`.

   **Admin and applicant both log in through the same login page/endpoint.**
   There is no separate admin login — the server reads `user_role` from the
   `users` table, embeds it in the token, and returns it in the response. The
   client uses `role` from the response to redirect: `admin` → admin dashboard,
   `applicant` → applicant dashboard.
3. **Every authenticated request** — the browser automatically attaches the
   cookie (fetch is called with `credentials: "include"`). The server extracts
   it and runs it through `jsonwebtoken.verify()` with the same secret; if
   valid, the payload (user id + role) is attached to the request and the
   handler proceeds. If missing, expired, or tampered with → `401`.
4. **Logout** — `POST /api/auth/logout` clears the cookie server-side. The
   client also drops its `localStorage` session copy.

### Why JWT

The server is stateless — it doesn't store sessions, so any server instance can
validate any token from the shared secret. This matters once the client needs
user-specific routes (an applicant only sees their own applications; the admin
sees all).

### `verifyAuth` / `requireAdmin` middleware pattern

```js
import jwt from "jsonwebtoken";

const COOKIE_NAME = "iams_token";
const TOKEN_VERIFY_OPTIONS = {
  algorithms: ["HS256"],
  issuer: "iams",
  audience: "iams-client",
};

export function verifyAuth(req, res, next) {
  // Cookie first, Bearer header kept for API/script clients
  const token = req.cookies?.[COOKIE_NAME]
    ?? req.headers.authorization?.startsWith("Bearer ")
    && req.headers.authorization.slice(7);
  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, TOKEN_VERIFY_OPTIONS);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
```

`requireAdmin` is chained after `verifyAuth` on admin-only routes:

```js
router.post("/", verifyAuth, requireAdmin, (req, res) => { /* ... */ });
```

The JWT secret lives in `server/.env` (`JWT_SECRET`), never in code, and the
server refuses to start with a secret shorter than 32 characters.

### Account lockout

After `5` failed login attempts for one username, the account is locked for
`15` minutes — further attempts get `429` `"Account temporarily locked"` even
with the correct password. The counter resets on a successful login. (In-memory
`Map` per server instance — a restart clears it.)

### Rate limiting

`express-rate-limit` guards every API route (in `server/src/index.js`):

| Limiter      | Scope             | Limit        | Window |
| ------------ | ----------------- | ------------ | ------ |
| `apiLimiter` | all `/api/*`      | 600 requests | 15 min |
| `loginLimiter` | `/api/auth/login` | 10 attempts  | 15 min |
| `signupLimiter` | `/api/auth/signup` | 5 accounts  | 1 hour |

Exceeded requests get `429` `"Too many requests..."`. Responses carry
draft-8 rate-limit headers (`ratelimit`, `ratelimit-policy`).

---

## 4. Endpoint reference

> Auth column: **Public** = no token required, **Auth** = requires a valid
> session cookie (`iams_token`, set by login) or `Authorization: Bearer <token>`.

### Auth

#### `POST /api/auth/signup` — Public

Create an applicant account. Validated server-side (see §5 rules); rate limited
to 5 per hour per IP.

**Body**

```json
{
  "full_name": "Anomalous",
  "email": "anomalous@intern.com",
  "username": "Anomalous",
  "password": "password123"
}
```

**Responses**

- `201` — `{ "data": { "id": 1 } }`
- `400` — missing/invalid fields (bad email, bad username, weak password)
- `409` — email or username already exists
- `429` — signup rate limit (5 accounts/hour) or API rate limit exceeded

**SQL**

```sql
INSERT INTO users (full_name, email, username, password_hash, role)
VALUES (?, ?, ?, ?, 'applicant');
```

#### `POST /api/auth/login` — Public

Verify credentials, set the `iams_token` session cookie, and return the user's
role. Used by **both applicants and admins** — the same login page posts here;
the response `role` tells the client where to redirect.

**Body**

```json
{
  "username": "Anomalous",
  "password": "password123"
}
```

**Responses**

- `200` — `{ "data": { "role": "applicant", "full_name": "Anomalous" } }`
  plus `Set-Cookie: iams_token=<jwt>; HttpOnly; SameSite=Strict` (role is
  `admin` for admin accounts). No token in the body.
- `400` — missing username/password
- `401` — invalid credentials
- `429` — account temporarily locked (5 failed attempts, 15 min), login rate
  limit (10 per 15 min), or API rate limit exceeded

**SQL**

```sql
SELECT * FROM users WHERE username = ?;
```

Password checked with `bcrypt.compare(password, user.password_hash)`.

#### `POST /api/auth/logout` — Public

Clear the session cookie.

**Responses**

- `200` — `{ "data": { "ok": true } }` plus `Set-Cookie: iams_token=; ...`
  (cookie removed)

#### `GET /api/auth/me` — Token

Return the **current** role and name straight from the DB (the JWT payload can
lag behind a role change). Also self-heals: an applicant whose application is
now `Hired` (or whose offer was accepted) is migrated to the `intern` role
here, so the client redirects them to the intern dashboard automatically.

**Responses**

- `200` — `{ "data": { "role": "applicant|intern|admin", "full_name": "..." } }`
- `401` — missing/expired token, or account deleted

---

### Roles (internship positions)

#### `GET /api/roles` — Public (Token once auth is enforced)

List all roles.

**Responses**

- `200` — `{ "data": [ { "id": 1, "title": "Software Engineer", "department": "Engineering", "status": "open", "description": null, "created_at": "..." } ] }`

**SQL**

```sql
SELECT * FROM roles ORDER BY created_at DESC;
```

#### `POST /api/roles` — Token (admin)

Create a role.

**Body**

```json
{
  "title": "Software Engineer",
  "department": "Engineering",
  "description": "Optional"
}
```

**Responses**

- `201` — `{ "data": { "id": 1 } }`
- `400` — missing `title`/`department`

**SQL**

```sql
INSERT INTO roles (title, department, status, description)
VALUES (?, ?, 'open', ?);
```

#### `PATCH /api/roles/:id` — Token (admin)

Update a role (e.g. close it).

**Body**

```json
{ "status": "closed" }
```

**Responses**

- `200` — `{ "data": { "id": 1 } }`
- `404` — role not found

**SQL**

```sql
UPDATE roles SET status = ? WHERE id = ?;
```

---

### Applications

#### `GET /api/applications` — Token

List applications. **Admins see all; applicants see only their own** — the
handler checks `req.user.role`, and for applicants filters by `req.user.sub`.
Joins users + roles for names:

**Responses**

- `200` — `{ "data": [ { "id": 1, "applicant_id": 2, "applicant_name": "John Doe", "role_id": 3, "role_title": "Software Engineer", "status": "In Review", "applied_at": "..." } ] }`

**SQL**

```sql
SELECT a.*, u.full_name AS applicant_name, r.title AS role_title
FROM applications a
JOIN users u ON u.id = a.applicant_id
JOIN roles r ON r.id = a.role_id
WHERE (? IS NULL OR a.applicant_id = ?)
ORDER BY a.applied_at DESC;
```

#### `POST /api/applications` — Token (applicant)

Submit an application.

**Body**

```json
{ "role_id": 3 }
```

**Responses**

- `201` — `{ "data": { "id": 1 } }`
- `400` — missing `role_id`
- `404` — role not found
- `409` — applicant already applied to this role (unique constraint)

**SQL**

```sql
INSERT INTO applications (applicant_id, role_id, status)
VALUES (?, ?, 'In Review');
```

#### `PATCH /api/applications/:id/status` — Token (admin)

Move an application through the pipeline.

**Body**

```json
{ "status": "Shortlisted" }
```

Valid values: `In Review | Shortlisted | Rejected | Hired`.

**Responses**

- `200` — `{ "data": { "id": 1 } }`
- `400` — invalid status
- `404` — application not found

**SQL**

```sql
UPDATE applications SET status = ? WHERE id = ?;
```

---

### Interviews

#### `GET /api/interviews` — Token

List interviews, joining the applicant and role.

**Responses**

- `200` — `{ "data": [ { "id": 1, "application_id": 2, "scheduled_at": "2026-08-10 10:00", "status": "Pending", "applicant_name": "John Doe", "role_title": "Software Engineer" } ] }`

**SQL**

```sql
SELECT i.*, u.full_name AS applicant_name, r.title AS role_title
FROM interviews i
JOIN applications a ON a.id = i.application_id
JOIN users u ON u.id = a.applicant_id
JOIN roles r ON r.id = a.role_id
ORDER BY i.scheduled_at;
```

#### `POST /api/interviews` — Token (admin)

Schedule an interview.

**Body**

```json
{
  "application_id": 2,
  "scheduled_at": "2026-08-10 10:00"
}
```

**Responses**

- `201` — `{ "data": { "id": 1 } }`
- `400` — missing fields
- `404` — application not found

**SQL**

```sql
INSERT INTO interviews (application_id, scheduled_at, status)
VALUES (?, ?, 'Pending');
```

---

### Offers

#### `GET /api/offers` — Token

List offers. **Admins see all; applicants/interns see only their own** — the
handler filters by `req.user.sub` for non-admins.

**Responses**

- `200` — `{ "data": [ { "id": 1, "application_id": 2, "status": "Extended", "created_at": "...", "applicant_id": 3, "applicant_name": "John Doe" } ] }`

**SQL**

```sql
SELECT o.*, u.full_name AS applicant_name
FROM offers o
JOIN applications a ON a.id = o.application_id
JOIN users u ON u.id = a.applicant_id;
```

#### `POST /api/offers` — Token (admin)

Extend an offer for an application.

**Body**

```json
{ "application_id": 2 }
```

**Responses**

- `201` — `{ "data": { "id": 1 } }`
- `400` — missing `application_id`
- `404` — application not found
- `409` — offer already exists for this application (unique)

#### `POST /api/offers/:id/accept` — Token (applicant who owns the offer)

Accept the offer for the current user's own application.

**Responses**

- `200` — `{ "data": { "id": 1, "status": "Accepted" } }`
- `403` — the offer belongs to someone else
- `404` — offer not found

Accepting promotes the applicant to the `intern` role — the same automatic
migration that happens when an application is marked `Hired`.

#### `PATCH /api/offers/:id/status` — Token (admin)

Move an offer through the lifecycle.

**Body**

```json
{ "status": "Accepted" }
```

Valid values: `Extended | Accepted | Declined`.

**Responses**

- `200` — `{ "data": { "id": 1, "status": "Accepted" } }`
- `400` — invalid status
- `404` — offer not found

Setting `Accepted` also promotes the applicant to `intern`.

---

### Interns

#### `GET /api/interns` — Token (admin)

All interns with their hired role/department, offer status, and task progress
(`tasks_total`, `tasks_done`, `progress` %).

#### `GET /api/interns/tasks` — Token

All tasks for admins; interns only get their own. Admins may filter with
`?intern_id=`.

#### `POST /api/interns/tasks` — Token (admin)

Assign a task. Body: `{ intern_id, title, description?, due_date?, status? }` —
`status` defaults to `pending` (`pending | in_progress | done`).

#### `PATCH /api/interns/tasks/:id` — Token (admin or assigned intern)

Update `{ status?, title?, description?, due_date? }`. Interns may only update
their own tasks.

#### `DELETE /api/interns/tasks/:id` — Token (admin)

#### `PATCH /api/interns/users/:id/role` — Token (admin)

Change a user's role — e.g. promote an intern to `admin`. Valid roles:
`admin | applicant | intern`. Changing your own role is blocked.

---

### Dashboard

#### `GET /api/dashboard/stats` — Token (admin)

Aggregate numbers for the dashboard cards. No joins needed — plain counts.

**Responses**

- `200`

```json
{
  "data": {
    "totalApplications": 15,
    "openRoles": 8,
    "pendingInterviews": 5,
    "offersExtended": 3,
    "applicationsByDepartment": [
      { "department": "Engineering", "count": 6 },
      { "department": "Design", "count": 4 }
    ]
  }
}
```

**SQL**

```sql
SELECT COUNT(*) FROM applications;
SELECT COUNT(*) FROM roles WHERE status = 'open';
SELECT COUNT(*) FROM interviews WHERE status = 'Pending';
SELECT COUNT(*) FROM offers;

SELECT r.department, COUNT(a.id) AS count
FROM applications a JOIN roles r ON r.id = a.role_id
GROUP BY r.department;
```

---

## 5. Infrastructure

### 404 handler

Placed after all routes — catches unmatched paths:

```js
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});
```

### Global error handler

Four-argument middleware — Express 5 forwards errors thrown in any handler
here. Log the error server-side, return a generic message:

```js
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
```

### Validation pattern

Inline per-route validation; keep it simple and explicit:

```js
router.post("/", (req, res) => {
  const { full_name, email, username, password } = req.body ?? {};
  if (!full_name || !email || !username || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }
  // ...
});
```

### Auth validation rules

| Field      | Rule                                                        |
| ---------- | ----------------------------------------------------------- |
| `username` | 3–30 chars, `[a-zA-Z0-9_]` only                              |
| `email`    | standard email format                                        |
| `password` | ≥ 8 chars, must contain at least one letter and one number   |
| `full_name`| ≤ 100 chars                                                  |

Violations return `400`. The signup route trims inputs before validating.

### Dependencies to add

```
npm install bcryptjs jsonwebtoken helmet express-rate-limit cookie-parser
```

- `bcryptjs` — password hashing (pure JS, no native build step)
- `jsonwebtoken` — sign and verify JWTs
- `helmet` — security headers (HSTS, `X-Frame-Options`, etc.)
- `express-rate-limit` — per-IP rate limiting + JSON `429` handlers
- `cookie-parser` — reads the `iams_token` session cookie

### Creating admin accounts

Admins are created with the included script (they then log in through the same
login page as everyone else):

```
node src/scripts/create-admin.js <username> <password> [full name]
```

### `server/.env` additions

```
JWT_SECRET=<long random string, at least 32 chars>
JWT_EXPIRES_IN=1h            # e.g. 30m, 8h, 2d
NODE_ENV=development         # production → Secure cookies + HSTS
```
