// Extended API service — re-exports everything from lib/api.js and adds new endpoints.
// Existing components keep importing from ../lib/api unchanged.
export * from "../lib/api";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function fetchZones() {
  const res = await fetch(`${BASE}/api/analytics/zones`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchIncidentById(id) {
  const res = await fetch(`${BASE}/api/incidents/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateIncidentStatus(id, status) {
  const res = await fetch(`${BASE}/api/incidents/${id}/status`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
