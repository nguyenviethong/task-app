//const BASE = "http://localhost:3001";

const BASE = "https://ai.titansportpq.vn";

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
  localStorage.setItem("us", data.username);

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
export function isLoggedIn() {
  return !!localStorage.getItem("token");
}

export async function saveAuth(data) {
  return await window.authStore.save(data);
}

export async function loadAuth() {
  if (!window.authStore) return null;
  return await window.authStore.load();
}

export async function clearAuth() {
  return await window.authStore.clear();
}

export async function ai() {
  return await window.authStore.ai();
}
