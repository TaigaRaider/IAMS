const BASE = import.meta.env.VITE_API_BASE ?? "/api";
const SESSION_KEY = "iams_session";
const MAX_RETRIES = 2;
const FETCH_TIMEOUT_MS = 10_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransient = (res) =>
  res == null ||
  res.status === 500 ||
  res.status === 502 ||
  res.status === 503 ||
  res.status === 504;

export async function api(path, { method = "GET", body } = {}) {
  // FormData bodies are sent as multipart — the browser sets the boundary
  // header itself, so no Content-Type here.
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = isForm ? {} : { "Content-Type": "application/json" };
  const session = getSession();
  if (session?.role && !session.token) {
    throw new Error("Missing session token — please sign in again");
  }
  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Never let a hung proxy/server leave the page on an infinite spinner —
    // abort and treat it as a transient failure so the retry/auth guards kick in.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(BASE + path, {
        method,
        headers,
        credentials: "omit",
        body: body == null ? undefined : isForm ? body : JSON.stringify(body),
        signal: controller.signal,
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
        err.code = json.code;
        err.retryAfter = json.retryAfter;
        throw err;
      }
      return json.data;
    } catch (err) {
      // Network-level failure (Turso connect timeouts surface as fetch errors)
      // or a timed-out fetch — both are transient.
      if (
        attempt < MAX_RETRIES &&
        (err instanceof TypeError || err?.name === "AbortError")
      ) {
        await sleep(300 * (attempt + 1));
        continue;
      }
      if (err?.name === "AbortError") {
        const timedOut = new Error(
          "The server took too long to respond. Please try again.",
        );
        timedOut.status = 0;
        throw timedOut;
      }
      throw err;
    } finally {
      clearTimeout(timeout);
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

// Download a server-generated file (CSV/PDF). Uses the same auth token as
// api() but reads the raw response body.
export async function downloadFile(path, filename) {
  const session = getSession();
  const headers = {};
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  const res = await fetch(BASE + path, { headers, credentials: "omit" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
