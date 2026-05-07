import { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import { AlertOctagon, Radio } from "lucide-react";
import { useWebSocket } from "./hooks/useWebSocket";
import IncidentForm from "./components/IncidentForm";
import LiveFeed from "./components/LiveFeed";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import ServiceStatus from "./components/ServiceStatus";
import IncidentList from "./components/IncidentList";

const SEV_TOAST = {
  CRITICAL: { icon: "🚨", style: { background: "#1a0808", color: "#ff3b3b", border: "1px solid rgba(255,59,59,0.4)" } },
  HIGH: { icon: "🔴", style: { background: "#1a0e00", color: "#ff9500", border: "1px solid rgba(255,149,0,0.4)" } },
  MEDIUM: { icon: "🟡", style: { background: "#181500", color: "#ffd60a", border: "1px solid rgba(255,214,10,0.4)" } },
  LOW: { icon: "🟢", style: { background: "#001610", color: "#00d084", border: "1px solid rgba(0,208,132,0.4)" } },
};

export default function App() {
  const { connected, notifications, lastIncident } = useWebSocket();
  const [refreshKey, setRefreshKey] = useState(0);

  // Toast on new incident via WebSocket
  useEffect(() => {
    if (!lastIncident) return;
    const cfg = SEV_TOAST[lastIncident.severity] || SEV_TOAST.LOW;
    toast(`${cfg.icon} ${lastIncident.description} — ${lastIncident.location}`, {
      duration: 5000,
      style: { ...cfg.style, fontFamily: "JetBrains Mono, monospace", fontSize: "13px", maxWidth: "400px" },
    });
  }, [lastIncident]);

  const handleNewIncident = (incident) => {
    setRefreshKey((k) => k + 1);
    toast.success(`Incidente registrado: ${incident.id.slice(0, 8)}...`, {
      style: { background: "#111318", color: "#00d084", border: "1px solid rgba(0,208,132,0.3)" },
      duration: 3000,
    });
  };

  return (
    <div className="min-h-screen bg-night text-white">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="border-b border-border bg-panel sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center glow-red">
              <AlertOctagon size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl tracking-[0.15em] text-white leading-none">
                CAMPUS<span className="text-accent">ALERT</span>
              </h1>
              <p className="text-xs font-mono text-dim leading-none mt-0.5">
                Sistema distribuido de emergencias universitarias
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Radio size={13} className={connected ? "text-safe animate-pulse-fast" : "text-dim"} />
            <span className={`text-xs font-mono ${connected ? "text-safe" : "text-dim"}`}>
              {connected ? "LIVE" : "OFFLINE"}
            </span>
            {notifications.length > 0 && (
              <span className="ml-2 text-xs font-mono bg-accent/20 text-accent border border-accent/30 rounded-full px-2 py-0.5">
                {notifications.length} alertas
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Ticker if critical */}
      {notifications.some((n) => n.incident?.severity === "CRITICAL") && (
        <div className="bg-accent/90 text-white overflow-hidden py-1.5">
          <div className="ticker-inner inline-flex gap-12">
            {[...Array(2)].map((_, i) =>
              notifications
                .filter((n) => n.incident?.severity === "CRITICAL")
                .slice(0, 5)
                .map((n, j) => (
                  <span key={`${i}-${j}`} className="text-xs font-mono font-bold tracking-widest">
                    🚨 CRÍTICO: {n.incident?.description} — {n.incident?.location}
                  </span>
                ))
            )}
          </div>
        </div>
      )}

      {/* Main layout */}
      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left column */}
        <div className="lg:col-span-4 space-y-5">
          <IncidentForm onSuccess={handleNewIncident} />
          <ServiceStatus />
        </div>

        {/* Center */}
        <div className="lg:col-span-4 space-y-5">
          <LiveFeed notifications={notifications} connected={connected} />
          <IncidentList refresh={refreshKey} />
        </div>

        {/* Right */}
        <div className="lg:col-span-4">
          <AnalyticsDashboard />
        </div>
      </main>

      {/* Architecture footer */}
      <footer className="border-t border-border mt-8 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 justify-center">
            {[
              ["React + Vite", "#61DAFB"],
              ["API Gateway :3001", "#0a84ff"],
              ["Incident Service :3002", "#ff9500"],
              ["Notification Service :3003 (WS)", "#00d084"],
              ["Analytics Service :3004", "#bf5af2"],
              ["MQTT Broker :1883", "#ff3b3b"],
            ].map(([name, color]) => (
              <span key={name} className="text-xs font-mono" style={{ color }}>
                ⬡ {name}
              </span>
            ))}
          </div>
          <p className="text-center text-dim text-xs font-mono mt-2">
            Arquitectura distribuida · Comunicación asíncrona vía MQTT · Pruebas de carga con jMeter
          </p>
        </div>
      </footer>
    </div>
  );
}
