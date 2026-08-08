const BASE = "http://localhost:8580/api";

export async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };

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

// Session helpers (localStorage) — holds { role, full_name }; the auth token
// lives in an httpOnly cookie the browser sends automatically.
export const saveSession = (data) =>
  localStorage.setItem("iams_session", JSON.stringify(data));

export const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem("iams_session"));
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
  localStorage.removeItem("iams_session");
};
