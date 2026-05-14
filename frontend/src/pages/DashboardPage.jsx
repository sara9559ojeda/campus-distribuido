import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, Wifi, Zap, AlertTriangle, Shield, Clock } from "lucide-react";
import { toast } from "react-hot-toast";
import { useWS } from "../contexts/WebSocketContext";
import IncidentForm from "../components/IncidentForm";
import LiveFeed from "../components/LiveFeed";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import ServiceStatus from "../components/ServiceStatus";
import IncidentList from "../components/IncidentList";

function MetricCard({ label, value, sub, color, icon: Icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      className="bg-card border border-border rounded-xl p-4 card-hover"
      style={{ boxShadow: `0 0 24px ${color}10` }}
      role="region"
      aria-label={label}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-muted uppercase tracking-widest">{label}</span>
        {Icon && <Icon size={14} style={{ color }} aria-hidden="true" />}
      </div>
      <p className="font-display text-3xl tracking-wider" style={{ color }}>
        {value}
      </p>
      {sub && <p className="text-xs text-dim font-mono mt-1">{sub}</p>}
    </motion.div>
  );
}

export default function DashboardPage() {
  const { connected, notifications } = useWS();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNewIncident = (incident) => {
    setRefreshKey((k) => k + 1);
    toast.success(`Incidente registrado: ${incident.id.slice(0, 8)}...`, {
      style: {
        background: "#111318",
        color: "#00d084",
        border: "1px solid rgba(0,208,132,0.3)",
      },
      duration: 3000,
    });
  };

  const criticalCount = notifications.filter((n) => n.incident?.severity === "CRITICAL").length;
  const highCount     = notifications.filter((n) => n.incident?.severity === "HIGH").length;
  const mediumCount   = notifications.filter((n) => n.incident?.severity === "MEDIUM").length;

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* ── Top metric strip ─── */}
      <section aria-label="Métricas principales" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Total alertas"
          value={notifications.length}
          sub="desde conexión WS"
          color="#0a84ff"
          icon={Activity}
          delay={0}
        />
        <MetricCard
          label="Críticos"
          value={criticalCount}
          sub="máxima prioridad"
          color="#ff3b3b"
          icon={AlertTriangle}
          delay={0.05}
        />
        <MetricCard
          label="Altos"
          value={highCount}
          sub="requieren atención"
          color="#ff9500"
          icon={Shield}
          delay={0.1}
        />
        <MetricCard
          label="Medios"
          value={mediumCount}
          sub="monitoreo activo"
          color="#ffd60a"
          icon={Clock}
          delay={0.15}
        />
        <MetricCard
          label="MQTT Topics"
          value="3"
          sub="campus/incidents/#"
          color="#bf5af2"
          icon={Zap}
          delay={0.2}
        />
        <MetricCard
          label="WebSocket"
          value={connected ? "LIVE" : "OFF"}
          sub={connected ? "ws://localhost:3003" : "Reconectando..."}
          color={connected ? "#00d084" : "#4a5568"}
          icon={Wifi}
          delay={0.25}
        />
      </section>

      {/* ── Main grid — preserves original layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 space-y-5">
          <IncidentForm onSuccess={handleNewIncident} />
          <ServiceStatus />
        </div>

        <div className="lg:col-span-4 space-y-5">
          <LiveFeed notifications={notifications} connected={connected} />
          <IncidentList refresh={refreshKey} />
        </div>

        <div className="lg:col-span-4">
          <AnalyticsDashboard />
        </div>
      </div>
    </div>
  );
}
