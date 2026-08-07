# Connecting the Frontend to the Backend

Hands-on guide for wiring the React client pages to the IAMS API. Pairs with
[HTTP-requests.md](./HTTP-requests.md) for the endpoint details.

---

## 1. Setup facts

| Thing           | Value                                        |
| --------------- | -------------------------------------------- |
| API base URL    | `http://localhost:8580/api`                  |
| Server          | `npm run dev` inside `server/` (port from `.env`, currently 8580) |
| Client          | `npm run dev` inside `client/` (Vite dev server) |
| CORS origin     | Set via `ORIGIN` in `server/.env` — must match the Vite dev origin |
| Admin account   | `admin` / `admin123` (created via `node src/scripts/create-admin.js`) |
| Auth method     | `Authorization: Bearer <token>` header (token from login) |

Both servers must be running for the pages to talk to the API.

---

## 2. Shared fetch helper — `client/src/api.js`

Create this file so every page uses the same request logic.

```js
const BASE = "http://localhost:8580/api";

export async function api(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }
  return json.data;
}

// Session helpers (localStorage)
export const saveSession = (data) =>
  localStorage.setItem("iams_session", JSON.stringify(data));

export const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem("iams_session"));
  } catch {
    return null;
  }
};

export const getToken = () => getSession()?.token ?? null;

export const logout = () => localStorage.removeItem("iams_session");
```

Notes:

- `api()` returns the `{ data }` part of the response and throws on errors with
  the server's message — so `try/catch` around every call.
- Session is one object: `{ token, role, full_name }`.

---

## 3. Login page — `client/src/components/LoginForm.jsx`

One login page handles **both roles**: the server returns the user's `role`,
and the client redirects accordingly.

```jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, saveSession } from "../api";

export const LoginForm = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: { username, password },
      });
      saveSession(data); // { token, role, full_name }
      // Admin and applicant both log in here — role drives the redirect:
      navigate(data.role === "admin" ? "/dashboard" : "/applicant", { replace: true });
    } catch (err) {
      setError(err.message); // e.g. "Invalid credentials"
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form login-form">
      <h2>Welcome Back👋</h2>
      <p>Sign in to track your application</p>
      <form className="access-form" onSubmit={handleSubmit}>
        <label className="label username-label" htmlFor="username-field">
          Username:
        </label>
        <input
          className="field"
          type="text"
          id="username-field"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          placeholder="Anomalous"
        />
        <label className="label password-label" htmlFor="password-field">
          Password
        </label>
        <input
          className="field"
          type="password"
          id="password-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
        />
        {error && <p className="form-error">{error}</p>}
        <input
          className="submit-btn"
          type="submit"
          value={loading ? "Signing in..." : "Sign In"}
          disabled={loading}
        />
        <div className="reference">
          <span className="signup-reference">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </span>
        </div>
      </form>
    </div>
  );
};
```

Key points:

- Remove `method="POST"` from the `<form>` tag (React handles it in
  `handleSubmit`).
- `e.preventDefault()` then `await` the login — the navigate happens **after**
  the server responds, not before.
- `{ replace: true }` so the browser back button doesn't return to login.

---

## 4. Signup page — `client/src/components/SignUpForm.jsx`

```jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

export const SignUpForm = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api("/auth/signup", {
        method: "POST",
        body: { full_name: fullName, email, username, password },
      });
      navigate("/login"); // account created — go sign in
    } catch (err) {
      // 409 → "Email or username already exists", 400 → "All fields are required"
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form signup-form">
      <h2>Create your account</h2>
      <p>Start your internship application</p>
      <form className="access-form" onSubmit={handleSubmit}>
        {/* full name, email, password, confirm inputs with value/onChange as in LoginForm */}
        {error && <p className="form-error">{error}</p>}
        <input
          className="submit-btn"
          type="submit"
          value={loading ? "Creating account..." : "Create Account"}
          disabled={loading}
        />
        <div className="reference">
          <span className="signup-reference">
            Already have an account? <Link to="/login">Sign in</Link>
          </span>
        </div>
      </form>
    </div>
  );
};
```

---

## 5. Admin pages

Both fetches need the admin token:

```js
import { api, getToken, logout } from "../api";
```

### `client/src/screens/AdminDashboard.jsx`

Fetch the stats on mount and fill the cards:

```jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getToken, logout } from "../api";

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await api("/dashboard/stats", { token: getToken() });
        setStats(data);
      } catch (err) {
        if (err.message.includes("token") || err.message.includes("401")) {
          logout();
          navigate("/login");
        } else {
          setError(err.message);
        }
      }
    })();
  }, [navigate]);

  if (error) return <p className="form-error">{error}</p>;
  if (!stats) return <p>Loading...</p>;

  return (
    <>
      <div className="intcards">
        <div className="intcard">
          <div className="card-top">
            <span className="card-label">Total Applications</span>
            <span className="card-icon"><FileText /></span>
          </div>
          <h1>{stats.totalApplications}</h1>
        </div>
        {/* repeat for openRoles → "Open Roles", pendingInterviews, offersExtended */}
      </div>
      {/* "Applications by Department" bars use stats.applicationsByDepartment */}
    </>
  );
}
```

### `client/src/screens/AdminApplicantsPage.jsx`

Replace the hardcoded `applicants` array with a fetch of `GET /api/applications`:

```jsx
useEffect(() => {
  (async () => {
    try {
      const data = await api("/applications", { token: getToken() });
      setApplicants(data);
    } catch (err) {
      // 401 → logout + navigate("/login")
    }
  })();
}, []);
```

Field mapping from the API to the table:

| Table column   | API field          |
| -------------- | ------------------ |
| Applicant      | `applicant_name`   |
| Applied For    | `role_title`       |
| Applied On     | `applied_at`       |
| Status         | `status`           |

Optional: update an application's status via `PATCH /api/applications/:id/status`
with `{ status: "Shortlisted" }` (admin token) and re-fetch the list.

---

## 6. Applicant page — `client/src/screens/ApplicantPage.jsx`

The applicant page shows the logged-in user's own applications.

```jsx
useEffect(() => {
  (async () => {
    try {
      const data = await api("/applications", { token: getToken() });
      // The server only returns THIS user's applications
      setApplications(data);
    } catch (err) {
      // 401 → logout + navigate("/login")
    }
  })();
}, []);
```

- "My Application" status badge ← `applications[0].status` (their latest application)
- Browse roles: `GET /api/roles` (public, no token needed)
- Apply: `POST /api/applications` with `{ role_id }` and the user token —
  a second apply to the same role throws `409 "Already applied to this role"`.

---

## 7. App.jsx — missing applicant route

`client/src/App.jsx` currently has no route for the applicant dashboard, and
`client/src/components/ApplicantDashboard.jsx` is an empty file. Add the route:

```jsx
import ApplicantPage from "./screens/ApplicantPage.jsx";

<Route path="/applicant" element={<ApplicantPage />} />
```

If the applicant dashboard shell (header/nav) is meant to wrap it, build it in
`ApplicantDashboard.jsx` and route to that instead.

---

## 8. Common gotchas

1. **Both servers running?** The client needs Vite up and the API needs
   `server/` running — `fetch` fails with `ECONNREFUSED` if the API is down.
2. **CORS mismatch** — if `ORIGIN` in `server/.env` doesn't match the Vite dev
   origin, requests fail in the browser. Check the Vite port and the `.env` value.
3. **Token expired/invalid** — any protected call returns `401`. The pattern in
   section 5 handles it: `logout()` + redirect to `/login`.
4. **Await the response before navigating** — forms must `await api(...)` and
   only then `navigate(...)`, otherwise users land on the page before the server
   even replied.
5. **Controlled inputs** — give every field `value` + `onChange`, or the server
   receives `undefined`/empty strings and returns `400`.
6. **Debug first** — before touching the page, verify the endpoint with curl:
   ```bash
   curl -X POST http://localhost:8580/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
   ```
   If curl works and the page doesn't, it's a client bug (CORS, headers, token).
