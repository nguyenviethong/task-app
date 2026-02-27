const BASE = "http://localhost:3001";

export async function login(username, password) {
  const r = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data.error);

  localStorage.setItem("token", data.token);
  localStorage.setItem("apiKey", data.apiKey);

  return data;
}

export async function register(username, password) {
  const r = await fetch(`${BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data.error);

  return data;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("apiKey");
}

export function getAuthHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "x-api-key": localStorage.getItem("apiKey"),
    "Content-Type": "application/json"
  };
}
