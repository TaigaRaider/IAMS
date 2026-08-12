const BASE = import.meta.env.VITE_API_BASE ?? "/api";
const SESSION_KEY = "iams_session";
const MAX_RETRIES = 2;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransient = (res) =>
  res == null || res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504;

export async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const session = getSession();
  if (session?.role && !session.token) {
    throw new Error("Missing session token — please sign in again");
  }
  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(BASE + path, {
        method,
        headers,
        credentials: "omit",
        body: body ? JSON.stringify(body) : undefined,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Only retry when a server/connection problem made this request fail —
        // don't retry genuine 4xx (auth, validation, 404) responses.
        if (attempt < MAX_RETRIES && isTransient(res)) {
          await sleep(300 * (attempt + 1));
          continue;
        }
        const err = new Error(json.error || `Request failed (${res.status})`);
        err.status = res.status;
        throw err;
      }
      return json.data;
    } catch (err) {
      // Network-level failure (Turso connect timeouts surface as fetch errors).
      if (attempt < MAX_RETRIES && err instanceof TypeError) {
        await sleep(300 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
}

// Session helpers (sessionStorage) — holds { role, full_name, token }.
// Stored per-tab so two tabs can be signed in as different accounts; the
// auth token is sent as an Authorization header (the httpOnly cookie remains
// as a server-side fallback).
export const saveSession = (data) =>
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));

export const getSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
};

export const logout = async () => {
  try {
    await api("/auth/logout", { method: "POST" });
  } catch {
    // cookie may already be gone; still clear the local session
  }
  sessionStorage.removeItem(SESSION_KEY);
};