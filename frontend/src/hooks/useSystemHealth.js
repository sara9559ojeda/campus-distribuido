import { useState, useEffect, useCallback } from "react";

const SERVICES = [
  { name: "API Gateway",          port: "3001", color: "#0a84ff", description: "Proxy + rate limiting" },
  { name: "Incident Service",     port: "3002", color: "#ff9500", description: "MQTT publisher" },
  { name: "Notification Service", port: "3003", color: "#00d084", description: "WebSocket broker" },
  { name: "Analytics Service",    port: "3004", color: "#bf5af2", description: "MQTT subscriber" },
];

async function pingService(svc) {
  const start = Date.now();
  try {
    const res     = await fetch(`http://localhost:${svc.port}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    const latency = Date.now() - start;
    const data    = await res.json();
    return { ...svc, status: "ok", latency, data, error: null };
  } catch {
    return { ...svc, status: "down", latency: null, data: null, error: "Unreachable" };
  }
}

export function useSystemHealth() {
  const [services,    setServices]    = useState(SERVICES.map((s) => ({ ...s, status: "checking", latency: null, data: null })));
  const [history,     setHistory]     = useState([]);
  const [lastChecked, setLastChecked] = useState(null);
  const [checking,    setChecking]    = useState(false);

  const checkAll = useCallback(async () => {
    setChecking(true);
    const results = await Promise.all(SERVICES.map(pingService));
    setServices(results);
    setLastChecked(new Date());

    const upCount    = results.filter((r) => r.status === "ok").length;
    const downCount  = results.filter((r) => r.status === "down").length;
    const latencies  = results.filter((r) => r.latency !== null).map((r) => r.latency);
    const avgLatency = latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

    setHistory((prev) => [
      ...prev.slice(-29),
      {
        time:       new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
        timestamp:  Date.now(),
        up:         upCount,
        down:       downCount,
        avgLatency,
      },
    ]);
    setChecking(false);
  }, []);

  useEffect(() => {
    checkAll();
    const id = setInterval(checkAll, 10_000);
    return () => clearInterval(id);
  }, [checkAll]);

  const upCount    = services.filter((s) => s.status === "ok").length;
  const downCount  = services.filter((s) => s.status === "down").length;
  const latencies  = services.filter((s) => s.latency !== null).map((s) => s.latency);
  const avgLatency = latencies.length
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 0;

  // Derive WS client count from notification service health data
  const notifSvc   = services.find((s) => s.port === "3003");
  const wsClients  = notifSvc?.data?.wsClients ?? notifSvc?.data?.connectedClients ?? 0;

  // Derive MQTT broker status from incident service health data
  const incidentSvc  = services.find((s) => s.port === "3002");
  const mqttStatus   = incidentSvc?.data?.mqttConnected ?? incidentSvc?.data?.mqtt ?? false;

  return {
    services,
    history,
    lastChecked,
    checking,
    upCount,
    downCount,
    avgLatency,
    wsClients,
    mqttStatus,
    refresh: checkAll,
  };
}
