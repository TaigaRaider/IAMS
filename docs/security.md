# IAMS Security Documentation

How the IAMS system protects itself against authentication attacks: threat
model, implemented controls, configuration, and how to verify them.

---

## 1. Threat model

Assumed attackers (external, low-to-medium skill):

| Threat                                            | Example                                              |
| ------------------------------------------------- | ---------------------------------------------------- |
| Credential stuffing / brute force                 | Scripted guesses at login with known password lists  |
| Password cracking from DB leak                    | Stolen `users` table, plaintext/weak-hash passwords  |
| Token forgery / manipulation                      | Editing JWT payload, `alg: none` downgrade           |
| Token theft (XSS)                                 | Malicious script reading the token out of storage    |
| Session fixation / CSRF                           | Forcing a known session, cross-site form posts       |
| Account enumeration / signup flooding             | Probing emails, mass account creation                |
| Information disclosure                            | Server fingerprinting, verbose error messages        |
| Payload abuse                                     | Oversized request bodies, malformed JSON             |

Out of scope: attacks on the host machine, DoS at network layer, DB
compromise of the hosting account itself, insider admin abuse.

---

## 2. Controls and how they map to the threats

| Control                                | Implementation file                | Blocks                                |
| -------------------------------------- | ---------------------------------- | ------------------------------------- |
| bcrypt password hashing (12 rounds)    | `server/src/routes/auth.routes.js` | Password cracking from DB leak        |
| Account lockout (5 fails → 15 min)     | `server/src/routes/auth.routes.js` | Brute force on one account            |
| Per-IP rate limits (login/signup/api)  | `server/src/index.js`              | Credential stuffing, signup flooding  |
| Password policy (≥8, letter + number)  | `server/src/routes/auth.routes.js` | Weak-password credential stuffing     |
| Input validation (email, username, name, body size) | `auth.routes.js` + `express.json({ limit: "10kb" })` | Payload abuse, injection inputs |
| JWT pinned to HS256 + issuer + audience| `server/src/middleware/auth.middleware.js` | Token forgery, alg downgrade   |
| Short-lived token (`JWT_EXPIRES_IN`)   | `auth.routes.js`                   | Stolen-token window, replay           |
| `HttpOnly` session cookie              | `auth.routes.js`                   | Token theft via XSS                   |
| `SameSite=Strict` cookie               | `auth.routes.js`                   | CSRF / session fixation               |
| `Secure` cookie flag (production)      | `auth.routes.js`                   | Token sniffing on the wire            |
| Server-side logout (`/auth/logout`)    | `auth.routes.js`                   | Session reuse after logout            |
| Helmet security headers                | `server/src/index.js`              | Clickjacking, MIME sniffing, info disclosure, HSTS |
| Hidden `x-powered-by`                  | `server/src/index.js`              | Server fingerprinting                 |
| JWT secret length check (≥32 chars)    | `server/src/index.js`              | Secret brute force                    |
| Role checks on admin routes (`requireAdmin`) | `auth.middleware.js`         | Privilege escalation                  |
| Parameterized queries (Drizzle)        | `server/src/db.js` + all routes    | SQL injection                         |
| CORS locked to `ORIGIN`                | `server/src/index.js`              | Cross-origin read of the API          |
| Client-side route guards (`RequireAuth`) | `client/src/components/RequireAuth.jsx` | Unauthenticated users and role mismatches never see a dashboard |
| Live role re-validation (`GET /auth/me`) | `auth.routes.js`            | Stale/forged `localStorage` sessions  |
| Server-side role promotion only       | `applications.routes.js`, `offers.routes.js` | Applicant → intern migration can't be spoofed from the client |

---

## 3. Authentication flow (as implemented)

1. **Signup** — `POST /api/auth/signup`. Fields validated server-side
   (username `[a-zA-Z0-9_]{3,30}`, email format, password ≥8 chars with a
   letter and a number, name ≤100 chars). Password hashed with bcrypt
   (cost 12). Rate limited to 5 accounts/hour/IP.
2. **Login** — `POST /api/auth/login`. Checks lockout state first (5 failed
   attempts → `429` for 15 min, per username), verifies credentials with
   `bcrypt.compare`, records failures on wrong passwords, and on success
   signs a JWT (`HS256`, issuer `iams`, audience `iams-client`, payload
   `{ sub, role }`) and sets it as the `iams_token` cookie:
   `HttpOnly; SameSite=Strict; Max-Age=<JWT_EXPIRES_IN>; Path=/` —
   plus `Secure` when `NODE_ENV=production`. The token never appears in the
   response body.
3. **Every request** — `verifyAuth` reads the cookie (falling back to a
   `Bearer` header for API/script clients), verifies with the pinned options,
   and attaches `req.user`. Admin-only routes chain `requireAdmin` after it.
4. **Route guards** — `RequireAuth` in `client/src/components/RequireAuth.jsx`
   verifies the session with `GET /api/auth/me` (fresh role straight from the
   DB) before showing any dashboard, and redirects out of role-mismatched
   URLs; server-side middleware stays the source of truth.
5. **Logout** — `POST /api/auth/logout` clears the cookie; the client also
   clears its `localStorage` session copy.

### Applicant → intern migration

The `intern` role is granted **only server-side**, never from the client:
- when an application is marked `Hired` (admin),
- when an offer is accepted (`PATCH /api/offers/:id/status` by admin or
  `POST /api/offers/:id/accept` by the applicant), or
- self-healing in `GET /auth/me` for users whose application is already
  `Hired`.

`GET /auth/me` returns the freshest DB role, so a stale token or
`localStorage` copy can't keep someone on the applicant page after being
promoted, nor vice versa.

---

## 4. Server configuration (`server/.env`)

| Variable             | Purpose                            | Current value     |
| -------------------- | ---------------------------------- | ----------------- |
| `JWT_SECRET`         | Signs tokens; server warns if < 32 chars | random string (rotated if ever pasted) |
| `JWT_EXPIRES_IN`     | Session lifetime                   | `1h`              |
| `NODE_ENV`           | `production` → `Secure` cookie + HSTS | `development`  |
| `ORIGIN`             | CORS origin (must match the client) | `http://localhost:5173` |
| `PORT`               | API port                            | `8580`            |

## 5. Client-side posture

- The JWT is stored **only** in the `HttpOnly` cookie — JS never reads it, so
  an XSS payload cannot exfiltrate it.
- `localStorage` (`iams_session`) holds only `{ role, full_name }` — UI
  metadata, not credentials.
- Every fetch uses `credentials: "include"` so the browser sends the cookie.

## 6. Testing the controls

Automated check: `C:\Users\Admin\AppData\Local\Temp\opencode\auth-attack.mjs`
(21 assertions — run with the server up on port 8580). Manual spot checks:

```bash
# cookie-based auth
curl -c jar.txt -X POST http://localhost:8580/api/auth/login \
  -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
curl -b jar.txt http://localhost:8580/api/dashboard/stats

# forged token must 401
curl http://localhost:8580/api/applications -H "Authorization: Bearer x.y.z"

# 5 wrong passwords lock the account (429 on the 6th)
for i in 1 2 3 4 5 6; do curl -s -o /dev/null -w "%{http_code} " -X POST \
  http://localhost:8580/api/auth/login -H "Content-Type: application/json" \
  -d "{\"username\":\"victim\",\"password\":\"wrongpass1\"}"; done; echo

# rate limits: 10 login requests per 15 min, then 429
```

Regression risk: the lockout and rate-limit state is in-memory, so a server
restart resets it — useful when tests accidentally lock the `admin` account.

## 7. Known limitations / future work

- **In-memory lockout/rate state** — lost on restart; single-process only.
  Move to the DB or Redis for multi-instance deployment.
- **No email verification** — accounts are active on signup; signup is rate
  limited but a determined attacker with many IPs can still create accounts.
- **No password reset / change flow** — an admin must intervene manually.
- **No audit log** — login failures and admin actions are not recorded.
- **Cookie + API fallback** — the Bearer-header fallback exists for script
  clients; if browser-only is acceptable, drop it to shrink the attack surface.
- **Secrets hygiene** — if a Turso auth token or `JWT_SECRET` is ever pasted
  into a chat/log, rotate it (`turso db tokens rotate` for Turso).
