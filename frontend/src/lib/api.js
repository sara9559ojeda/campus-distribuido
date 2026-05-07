const BASE = "http://localhost:3001";

export async function reportIncident(data) {
  const res = await fetch(`${BASE}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchIncidents(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/api/incidents${query ? "?" + query : ""}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchAnalytics() {
  const res = await fetch(`${BASE}/api/analytics`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function checkHealth() {
  const services = ["3001", "3002", "3003", "3004"];
  const names = ["API Gateway", "Incident Service", "Notification Service", "Analytics Service"];
  
  const results = await Promise.allSettled(
    services.map((port) =>
      fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(2000) })
        .then((r) => r.json())
    )
  );

  return results.map((r, i) => ({
    name: names[i],
    port: services[i],
    status: r.status === "fulfilled" ? "ok" : "down",
    data: r.status === "fulfilled" ? r.value : null,
  }));
}
