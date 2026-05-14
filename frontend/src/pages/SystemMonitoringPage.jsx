import { motion } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Server, Activity, Wifi, Radio, RefreshCw,
  CheckCircle2, XCircle, Clock, Zap, Database,
} from "lucide-react";
import { useSystemHealth } from "../hooks/useSystemHealth";
import { useWS } from "../contexts/WebSocketContext";

// ── Recharts tooltip ──────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-panel border border-border rounded-xl p-3 font-mono text-xs shadow-xl">
      <p className="text-muted mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
          <span style={{ color: p.color }}>{p.name}: {p.value}{p.name === "avgLatency" ? "ms" : ""}</span>
        </div>
      ))}
    </div>
  );
}

// ── Service card ──────────────────────────────────────────────
function ServiceCard({ svc, delay }) {
  const isOk      = svc.status === "ok";
  const isChecking = svc.status === "checking";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-card border border-border rounded-2xl p-5 card-hover"
      style={{ boxShadow: isOk ? `0 0 20px ${svc.color}15` : undefined }}
      role="region"
      aria-label={`${svc.name}: ${isOk ? "operativo" : isChecking ? "verificando" : "caído"}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${svc.color}15`, border: `1px solid ${svc.color}30` }}
            aria-hidden="true"
          >
            <Server size={18} style={{ color: svc.color }} />
          </div>
          <div>
            <p className="text-sm text-white font-body">{svc.name}</p>
            <p className="text-xs font-mono text-dim">:{svc.port}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isChecking ? (
            <div className="w-2 h-2 rounded-full bg-dim animate-pulse" aria-hidden="true" />
          ) : isOk ? (
            <CheckCircle2 size={18} className="text-safe" aria-hidden="true" />
          ) : (
            <XCircle size={18} className="text-accent" aria-hidden="true" />
          )}
          <span
            className={`text-xs font-mono px-2.5 py-1 rounded-lg ${
              isOk      ? "bg-safe/12 text-safe border border-safe/30"   :
              isChecking? "bg-dim/30 text-muted border border-dim/30"    :
                          "bg-accent/12 text-accent border border-accent/30"
            }`}
          >
            {isChecking ? "CHECKING" : isOk ? "OK" : "DOWN"}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="bg-night border border-border rounded-lg px-3 py-2">
          <p className="text-dim mb-0.5">Latency</p>
          <p style={{ color: isOk ? svc.color : "#4a5568" }}>
            {svc.latency !== null ? `${svc.latency}ms` : "—"}
          </p>
        </div>
        <div className="bg-night border border-border rounded-lg px-3 py-2">
          <p className="text-dim mb-0.5">Uptime</p>
          <p className="text-muted">
            {svc.data?.uptime !== undefined
              ? `${Math.floor(svc.data.uptime)}s`
              : "—"
            }
          </p>
        </div>

        {/* Service-specific extras */}
        {svc.port === "3002" && (
          <>
            <div className="bg-night border border-border rounded-lg px-3 py-2">
              <p className="text-dim mb-0.5">Incidents</p>
              <p className="text-white">{svc.data?.incidentCount ?? "—"}</p>
            </div>
            <div className="bg-night border border-border rounded-lg px-3 py-2">
              <p className="text-dim mb-0.5">MQTT</p>
              <p className={svc.data?.mqttConnected ? "text-safe" : "text-muted"}>
                {svc.data?.mqttConnected ? "Connected" : "—"}
              </p>
            </div>
          </>
        )}
        {svc.port === "3003" && (
          <>
            <div className="bg-night border border-border rounded-lg px-3 py-2">
              <p className="text-dim mb-0.5">WS Clients</p>
              <p className="text-safe">{svc.data?.wsClients ?? svc.data?.connectedClients ?? "—"}</p>
            </div>
            <div className="bg-night border border-border rounded-lg px-3 py-2">
              <p className="text-dim mb-0.5">Notifications</p>
              <p className="text-white">{svc.data?.notificationCount ?? "—"}</p>
            </div>
          </>
        )}
        {svc.port === "3004" && (
          <>
            <div className="bg-night border border-border rounded-lg px-3 py-2">
              <p className="text-dim mb-0.5">Avg RT</p>
              <p className="text-purple-400">{svc.data?.avgResponseTime ? `${svc.data.avgResponseTime}ms` : "—"}</p>
            </div>
            <div className="bg-night border border-border rounded-lg px-3 py-2">
              <p className="text-dim mb-0.5">Total</p>
              <p className="text-white">{svc.data?.totalIncidents ?? "—"}</p>
            </div>
          </>
        )}
      </div>

      {/* Description */}
      <p className="text-[10px] font-mono text-dim mt-3">{svc.description}</p>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function SystemMonitoringPage() {
  const { connected, notifications } = useWS();
  const {
    services, history, lastChecked, checking,
    upCount, downCount, avgLatency, wsClients, mqttStatus,
    refresh,
  } = useSystemHealth();

  const recentNotifCount = notifications.slice(0, 60).length;
  const eventsPerMin     = history.length >= 2
    ? Math.round(recentNotifCount / Math.max(history.length, 1))
    : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* ── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl tracking-wider text-white flex items-center gap-3">
            <Activity size={28} className="text-safe" aria-hidden="true" />
            SYSTEM MONITORING
          </h2>
          <p className="text-xs font-mono text-muted mt-0.5">
            {upCount}/{services.length} servicios activos
            {lastChecked && ` · Última verificación: ${lastChecked.toLocaleTimeString("es-CO")}`}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={checking}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl
                     text-sm text-muted hover:text-white transition-colors
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-info
                     disabled:opacity-50"
          aria-label="Verificar servicios ahora"
        >
          <RefreshCw size={14} className={checking ? "animate-spin" : ""} aria-hidden="true" />
          Check now
        </button>
      </div>

      {/* ── KPI strip ─── */}
      <section aria-label="Métricas del sistema" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Servicios UP",    value: upCount,         sub: "de 4 microservicios", color: "#00d084", icon: CheckCircle2 },
          { label: "Servicios DOWN",  value: downCount,       sub: downCount > 0 ? "¡atención!" : "sin errores", color: downCount > 0 ? "#ff3b3b" : "#4a5568", icon: XCircle },
          { label: "Latency avg",     value: `${avgLatency}ms`, sub: "promedio health check", color: "#0a84ff", icon: Clock },
          { label: "WS Clientes",     value: wsClients,       sub: "conectados ahora",    color: "#00d084", icon: Wifi   },
          { label: "MQTT Broker",     value: mqttStatus ? "UP" : "?", sub: ":1883 Mosquitto", color: mqttStatus ? "#00d084" : "#4a5568", icon: Radio },
          { label: "WS Estado",       value: connected ? "LIVE" : "OFF", sub: connected ? "ws://localhost:3003" : "desconectado", color: connected ? "#00d084" : "#4a5568", icon: Zap },
        ].map(({ label, value, sub, color, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-4 card-hover"
            style={{ boxShadow: `0 0 20px ${color}10` }}
            role="region"
            aria-label={`${label}: ${value}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-muted uppercase tracking-widest leading-tight">{label}</span>
              <Icon size={13} style={{ color }} aria-hidden="true" />
            </div>
            <p className="font-display text-3xl tracking-wider" style={{ color }}>{value}</p>
            <p className="text-xs text-dim font-mono mt-1">{sub}</p>
          </motion.div>
        ))}
      </section>

      {/* ── Service cards ─── */}
      <section aria-label="Estado de microservicios" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {services.map((svc, i) => (
          <ServiceCard key={svc.name} svc={svc} delay={i * 0.07} />
        ))}
      </section>

      {/* ── Charts row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Latency history */}
        <div className="bg-card border border-border rounded-2xl p-5" role="region" aria-label="Historial de latencia">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-info" aria-hidden="true" />
            <span className="font-display text-xl tracking-wider text-white">LATENCY HISTORY</span>
            <span className="text-xs font-mono text-dim ml-auto">Últimas verificaciones</span>
          </div>
          {history.length < 2 ? (
            <div className="flex items-center justify-center h-40 text-muted font-mono text-sm">
              Recopilando datos...
            </div>
          ) : (
            <div aria-label="Gráfica de latencia" style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} unit="ms" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="avgLatency"
                    stroke="#0a84ff"
                    strokeWidth={2}
                    dot={{ fill: "#0a84ff", r: 3 }}
                    name="avgLatency"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Service uptime chart */}
        <div className="bg-card border border-border rounded-2xl p-5" role="region" aria-label="Historial de servicios activos">
          <div className="flex items-center gap-2 mb-4">
            <Server size={16} className="text-safe" aria-hidden="true" />
            <span className="font-display text-xl tracking-wider text-white">SERVICES UPTIME</span>
            <span className="text-xs font-mono text-dim ml-auto">UP vs DOWN por check</span>
          </div>
          {history.length < 2 ? (
            <div className="flex items-center justify-center h-40 text-muted font-mono text-sm">
              Recopilando datos...
            </div>
          ) : (
            <div aria-label="Gráfica de servicios activos" style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                  <YAxis allowDecimals={false} domain={[0, 4]} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="up"   fill="#00d084" radius={[3, 3, 0, 0]} name="UP"   />
                  <Bar dataKey="down" fill="#ff3b3b" radius={[3, 3, 0, 0]} name="DOWN" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Architecture overview ─── */}
      <div className="bg-card border border-border rounded-2xl p-5" role="region" aria-label="Arquitectura del sistema">
        <div className="flex items-center gap-2 mb-5">
          <Database size={16} className="text-purple-400" aria-hidden="true" />
          <span className="font-display text-xl tracking-wider text-white">ARCHITECTURE MAP</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          {[
            {
              label: "MQTT Broker",
              sub:   "eclipse-mosquitto:2.0",
              port:  "1883 (MQTT) · 9001 (WS)",
              color: "#ff3b3b",
              desc:  "Pub/Sub distribuido · campus/incidents/#",
            },
            {
              label: "API Gateway",
              sub:   "Express + rate-limit",
              port:  "3001",
              color: "#0a84ff",
              desc:  "Proxy único · 10k req/min · UUID injection",
            },
            {
              label: "Incident Service",
              sub:   "Express + MQTT publisher",
              port:  "3002",
              color: "#ff9500",
              desc:  "In-memory store · publica a MQTT QoS 1",
            },
            {
              label: "Notification Service",
              sub:   "Express + WebSocket",
              port:  "3003",
              color: "#00d084",
              desc:  "MQTT subscriber · broadcast a WS clients",
            },
            {
              label: "Analytics Service",
              sub:   "Express + MQTT subscriber",
              port:  "3004",
              color: "#bf5af2",
              desc:  "Stats en memoria · top zones · avg RT",
            },
            {
              label: "React Frontend",
              sub:   "Vite + React 18",
              port:  "5173",
              color: "#61DAFB",
              desc:  "5 páginas · React Router · Recharts · Framer Motion",
            },
            {
              label: "WebSocket Client",
              sub:   "useWebSocket hook",
              port:  "ws://localhost:3003/ws",
              color: "#00d084",
              desc:  "Reconexión automática c/3s · buffer 50 notifs",
            },
            {
              label: "Docker Compose",
              sub:   "5 servicios + MQTT",
              port:  "health check c/8s",
              color: "#2496ED",
              desc:  "Contenedores independientes · node:20-alpine",
            },
          ].map(({ label, sub, port, color, desc }) => (
            <div
              key={label}
              className="bg-night border border-border rounded-xl p-3"
              style={{ borderLeftColor: color, borderLeftWidth: 3 }}
            >
              <p style={{ color }} className="font-bold mb-0.5">{label}</p>
              <p className="text-muted text-[10px]">{sub}</p>
              <p className="text-dim text-[10px] mt-0.5">:{port}</p>
              <p className="text-white/70 text-[10px] mt-1.5 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
