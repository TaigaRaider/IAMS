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
    auth.routes.js          POST /api/auth/signup, POST /api/auth/login
    roles.routes.js         GET/POST /api/roles, PATCH /api/roles/:id
    applications.routes.js  GET/POST /api/applications, PATCH /api/applications/:id/status
    interviews.routes.js    GET/POST /api/interviews
    offers.routes.js        GET/POST /api/offers
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

`index.js` keeps only the global middleware: `cors`, `express.json()`, the 404
handler, and the error handler.

---

## 3. JWT authentication

### What a JWT is

A **JSON Web Token** is a compact, signed string the server issues after login.
The client sends it back on every request to prove who it is. It has three parts,
each base64-encoded and joined by dots:

```
<header>.<payload>.<signature>
```

- **Header** — algorithm + token type: `{"alg": "HS256", "typ": "JWT"}`
- **Payload** — claims (data about the user): `{"sub": 5, "role": "applicant", "iat": 1754550000, "exp": 1754636400}` (`sub` = user id, `iat` = issued at, `exp` = expiry)
- **Signature** — hash of `header.payload` using a secret kept on the server. This is what makes the token unforgeable: if anyone edits the payload, the signature no longer matches and verification fails.

### The flow (logic)

1. **Signup** — client sends `full_name`, `email`, `username`, `password`.
   Server hashes the password with `bcryptjs` (never stores plaintext), inserts
   the user, returns `201`.
2. **Login** — client sends `username`, `password`. Server looks up the user,
   compares the password hash with `bcrypt.compare()`. On success it signs a
   JWT (`jsonwebtoken.sign`) containing the user id and role, and returns it
   together with the role and name:
   ```json
   { "data": { "token": "eyJhbGciOiJIUzI1NiIs...", "role": "applicant", "full_name": "Anomalous" } }
   ```

   **Admin and applicant both log in through the same login page/endpoint.**
   There is no separate admin login — the server reads `user_role` from the
   `users` table, embeds it in the token, and returns it in the response. The
   client uses `role` from the response to redirect: `admin` → admin dashboard,
   `applicant` → applicant dashboard.
3. **Every authenticated request** — client sends
   `Authorization: Bearer <token>`. The server runs the token through
   `jsonwebtoken.verify()` with the same secret; if valid, the payload
   (user id + role) is attached to the request and the handler proceeds. If
   missing, expired, or tampered with → `401`.

### Why JWT

The server is stateless — it doesn't store sessions, so any server instance can
validate any token from the shared secret. This matters once the client needs
user-specific routes (an applicant only sees their own applications; the admin
sees all).

### `verifyAuth` / `requireAdmin` middleware pattern

```js
import jwt from "jsonwebtoken";

export function verifyAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing auth token" });
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
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

The JWT secret lives in `server/.env` (`JWT_SECRET`), never in code.

---

## 4. Endpoint reference

> Auth column: **Public** = no token required, **Token** = requires
> `Authorization: Bearer <token>`.

### Auth

#### `POST /api/auth/signup` — Public

Create an applicant account.

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
- `400` — missing/invalid fields
- `409` — email or username already exists

**SQL**

```sql
INSERT INTO users (full_name, email, username, password_hash, role)
VALUES (?, ?, ?, ?, 'applicant');
```

#### `POST /api/auth/login` — Public

Verify credentials and return a JWT. Used by **both applicants and admins** —
the same login page posts here; the response `role` tells the client where to
redirect.

**Body**

```json
{
  "username": "Anomalous",
  "password": "password123"
}
```

**Responses**

- `200` — `{ "data": { "token": "eyJ...", "role": "applicant", "full_name": "Anomalous" } }` (`role` is `admin` for admin accounts)
- `400` — missing username/password
- `401` — invalid credentials

**SQL**

```sql
SELECT * FROM users WHERE username = ?;
```

Password checked with `bcrypt.compare(password, user.password_hash)`.

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

List offers.

**Responses**

- `200` — `{ "data": [ { "id": 1, "application_id": 2, "status": "Extended", "created_at": "...", "applicant_name": "John Doe" } ] }`

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

**SQL**

```sql
INSERT INTO offers (application_id, status)
VALUES (?, 'Extended');
```

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

### Dependencies to add

```
npm install bcryptjs jsonwebtoken
```

- `bcryptjs` — password hashing (pure JS, no native build step)
- `jsonwebtoken` — sign and verify JWTs

### Creating admin accounts

Admins are created with the included script (they then log in through the same
login page as everyone else):

```
node src/scripts/create-admin.js <username> <password> [full name]
```

### `server/.env` additions

```
JWT_SECRET=<long random string>
```
