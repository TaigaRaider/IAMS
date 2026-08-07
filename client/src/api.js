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