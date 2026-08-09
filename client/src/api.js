const BASE = import.meta.env.VITE_API_BASE ?? "/api";
const SESSION_KEY = "iams_session";

export async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getSession()?.token;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(BASE + path, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }
  return json.data;
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