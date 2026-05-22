import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  BrainCircuit, TrendingUp, TrendingDown, Minus,
  AlertTriangle, MapPin, Zap, RefreshCw, ShieldAlert,
} from "lucide-react";
import { useWS } from "../contexts/WebSocketContext";
import { useAnalytics } from "../hooks/useAnalytics";

// ── Custom recharts tooltip ───────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-panel border border-border rounded-xl p-3 font-mono text-xs shadow-xl">
      <p className="text-muted mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
          <span style={{ color: p.color }}>{p.name}: {p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Risk score gauge ──────────────────────────────────────────
function RiskGauge({ score, level }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative w-36 h-36 rounded-full flex items-center justify-center"
        style={{
          background: `conic-gradient(${level.color} ${score * 3.6}deg, #1e2330 0deg)`,
          boxShadow: `0 0 30px ${level.color}30`,
        }}
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Risk score: ${score} de 100`}
      >
        <div className="absolute inset-3 rounded-full bg-panel flex flex-col items-center justify-center">
          <span className="font-display text-4xl tracking-wider" style={{ color: level.color }}>
            {score}
          </span>
          <span className="text-xs font-mono text-muted">/ 100</span>
        </div>
      </div>
      <div
        className="px-4 py-1.5 rounded-full border font-mono text-sm font-bold tracking-widest"
        style={{ color: level.color, borderColor: level.border, background: level.bg }}
        aria-label={`Nivel de riesgo: ${level.label}`}
      >
        {level.label}
      </div>
    </div>
  );
}

// ── Trend indicator ───────────────────────────────────────────
function TrendChip({ trend }) {
  const map = {
    escalating:       { icon: TrendingUp,   color: "#ff3b3b", label: "ESCALATING"  },
    improving:        { icon: TrendingDown,  color: "#00d084", label: "IMPROVING"   },
    stable:           { icon: Minus,         color: "#ffd60a", label: "STABLE"      },
    insufficient_data:{ icon: Minus,         color: "#4a5568", label: "INSUFFICIENT DATA" },
  };
  const { icon: Icon, color, label } = map[trend.status] || map.stable;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-bold tracking-wider"
      style={{ color, borderColor: `${color}40`, background: `${color}15` }}>
      <Icon size={13} aria-hidden="true" />
      {label}
      {trend.ratePct > 0 && ` +${trend.ratePct}%`}
    </div>
  );
}

// ── Zone heat card ────────────────────────────────────────────
function ZoneCard({ zone, delay }) {
  const { level, score, totalCount, recentCount, trend } = zone;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-card border rounded-xl p-4 card-hover"
      style={{ borderColor: level.border, boxShadow: `0 0 16px ${level.color}15` }}
      role="region"
      aria-label={`Zona ${zone.zone}: riesgo ${level.label}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin size={13} style={{ color: level.color }} aria-hidden="true" />
          <span className="text-sm text-white font-body truncate">{zone.zone}</span>
        </div>
        <span
          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border"
          style={{ color: level.color, borderColor: level.border, background: level.bg }}
        >
          {level.label}
        </span>
      </div>

      {/* Risk bar */}
      <div className="risk-bar-track h-1.5 mb-2">
        <div
          className="risk-bar-fill"
          style={{ width: `${score}%`, background: level.color }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-muted">Score: <span style={{ color: level.color }}>{score}/100</span></span>
        <div className="flex gap-3 text-muted">
          <span>Total: {totalCount}</span>
          {recentCount > 0 && <span className="text-warn">Recientes: {recentCount}</span>}
        </div>
      </div>

      {trend === "rising" && (
        <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-warn">
          <TrendingUp size={10} aria-hidden="true" />
          Actividad reciente detectada
        </div>
      )}
    </motion.div>
  );
}

// ── Predictive alert banner ───────────────────────────────────
function PredictiveAlertBanner({ alert, delay }) {
  const colors = {
    CRITICAL: { bg: "bg-red-500/10",    border: "border-red-500/30",    text: "text-red-400",    icon: "#ff3b3b" },
    HIGH:     { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", icon: "#ff9500" },
    MEDIUM:   { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", icon: "#ffd60a" },
  };
  const c = colors[alert.type] || colors.MEDIUM;
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={`${c.bg} border ${c.border} rounded-xl p-4`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert size={16} style={{ color: c.icon }} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <p className={`text-sm font-body ${c.text}`}>{alert.message}</p>
          <p className="text-xs font-mono text-muted mt-0.5">{alert.detail}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <MapPin size={10} className="text-muted" aria-hidden="true" />
            <span className="text-xs font-mono text-muted">{alert.zone}</span>
          </div>
        </div>
        <span
          className={`flex-shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${c.text} ${c.border} ${c.bg}`}
        >
          {alert.type}
        </span>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function PredictiveAnalyticsPage() {
  const { notifications } = useWS();
  const {
    analytics, loading, refresh,
    zoneRisks, trend, predictiveAlerts,
    timelineData, severityDist,
    overallScore, overallRisk,
  } = useAnalytics(notifications);

  const SEV_COLORS = {
    CRITICAL: "#ff3b3b",
    HIGH:     "#ff9500",
    MEDIUM:   "#ffd60a",
    LOW:      "#00d084",
  };

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* ── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl tracking-wider text-white flex items-center gap-3">
            <BrainCircuit size={28} className="text-purple-400" aria-hidden="true" />
            PREDICTIVE ANALYTICS
          </h2>
          <p className="text-xs font-mono text-muted mt-0.5">
            Análisis estadístico de tendencias · Sin modelos ML complejos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TrendChip trend={trend} />
          <button
            onClick={refresh}
            disabled={loading}
            className="text-muted hover:text-white p-2 rounded-lg border border-border
                       transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-info"
            aria-label="Actualizar analytics"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Row 1: Risk gauge + alerts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Overall risk */}
        <div
          className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-5"
          style={{ boxShadow: `0 0 30px ${overallRisk.color}15` }}
          role="region"
          aria-label="Riesgo global del campus"
        >
          <p className="font-mono text-xs text-muted uppercase tracking-widest">
            Campus Risk Score
          </p>
          <RiskGauge score={overallScore} level={overallRisk} />

          {/* Formula explanation */}
          <div className="w-full bg-night border border-border rounded-xl p-3 text-xs font-mono text-muted">
            <p className="text-muted mb-1 uppercase tracking-widest">Fórmula</p>
            <p className="text-green-400">CRITICAL×5 + HIGH×3 + MEDIUM×2 + LOW×1</p>
            <p className="mt-1">Normalizado a 0–100</p>
          </div>

          {/* Severity breakdown */}
          {analytics?.bySeverity && (
            <div className="w-full grid grid-cols-2 gap-2 text-xs font-mono">
              {Object.entries(SEV_COLORS).map(([sev, color]) => (
                <div key={sev} className="flex items-center justify-between bg-night border border-border rounded-lg px-2.5 py-1.5">
                  <span style={{ color }}>{sev}</span>
                  <span className="text-white">{analytics.bySeverity[sev] || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Predictive alerts */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5" role="region" aria-label="Alertas predictivas">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-warn" aria-hidden="true" />
            <span className="font-display text-xl tracking-wider text-white">ALERTAS PREDICTIVAS</span>
            {predictiveAlerts.length > 0 && (
              <span className="ml-auto text-xs font-mono bg-warn/15 text-warn border border-warn/30 rounded-full px-2 py-0.5">
                {predictiveAlerts.length} activa{predictiveAlerts.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {predictiveAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <Zap size={28} className="text-muted" aria-hidden="true" />
              <div>
                <p className="text-muted text-sm">Sin alertas predictivas activas</p>
                <p className="text-muted text-xs font-mono mt-1">
                  El sistema monitorea tendencias en tiempo real
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-72">
              {predictiveAlerts.map((alert, i) => (
                <PredictiveAlertBanner key={alert.id} alert={alert} delay={i * 0.06} />
              ))}
            </div>
          )}

          {/* Trend stats */}
          {trend.status !== "insufficient_data" && (
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-3">
              <div className="bg-night border border-border rounded-xl p-3 text-center">
                <p className="text-xs font-mono text-muted mb-1">Recientes HIGH+</p>
                <p className="font-display text-2xl text-warn">{trend.recentHigh || 0}</p>
              </div>
              <div className="bg-night border border-border rounded-xl p-3 text-center">
                <p className="text-xs font-mono text-muted mb-1">Anteriores HIGH+</p>
                <p className="font-display text-2xl text-muted">{trend.olderHigh || 0}</p>
              </div>
              <div className="bg-night border border-border rounded-xl p-3 text-center">
                <p className="text-xs font-mono text-muted mb-1">Variación</p>
                <p className={`font-display text-2xl ${
                  trend.direction === "up" ? "text-accent" :
                  trend.direction === "down" ? "text-safe" : "text-yellow"
                }`}>
                  {trend.direction === "up" ? "+" : trend.direction === "down" ? "−" : "≈"}{trend.ratePct}%
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Timeline chart ─── */}
      <div className="bg-card border border-border rounded-2xl p-5" role="region" aria-label="Línea de tiempo de incidentes">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={16} className="text-info" aria-hidden="true" />
          <span className="font-display text-xl tracking-wider text-white">INCIDENT TIMELINE</span>
          <span className="text-xs font-mono text-muted ml-auto">Últimas 12 horas · datos WS en tiempo real</span>
        </div>
        <div aria-label="Gráfica de incidentes por hora" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {Object.entries(SEV_COLORS).map(([sev, color]) => (
                  <linearGradient key={sev} id={`grad-${sev}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={color} stopOpacity={0}    />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              {Object.entries(SEV_COLORS).map(([sev, color]) => (
                <Area
                  key={sev}
                  type="monotone"
                  dataKey={sev}
                  stroke={color}
                  strokeWidth={1.5}
                  fill={`url(#grad-${sev})`}
                  dot={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 3: Zone heat map + Severity pie ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Zone heat cards */}
        <div className="lg:col-span-3 space-y-3" role="region" aria-label="Zonas de riesgo">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={16} className="text-warn" aria-hidden="true" />
            <span className="font-display text-xl tracking-wider text-white">HEAT ZONES</span>
            <span className="text-xs font-mono text-muted ml-auto">Por risk score</span>
          </div>
          {loading && zoneRisks.length === 0 ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />
            ))
          ) : zoneRisks.length === 0 ? (
            <div className="bg-card border border-border rounded-xl py-12 text-center text-muted font-mono text-sm">
              Sin datos de zonas aún
            </div>
          ) : (
            zoneRisks.map((z, i) => (
              <ZoneCard key={z.zone} zone={z} delay={i * 0.05} />
            ))
          )}
        </div>

        {/* Severity pie */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5" role="region" aria-label="Distribución por severidad">
          <p className="font-display text-xl tracking-wider text-white mb-4">SEVERITY SPLIT</p>
          {severityDist.every((d) => d.value === 0) ? (
            <div className="flex items-center justify-center h-48 text-muted font-mono text-sm">
              Sin datos aún
            </div>
          ) : (
            <>
              <div aria-label="Gráfica circular de severidad" style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {severityDist.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} opacity={0.85} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-3">
                {severityDist.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} aria-hidden="true" />
                      <span style={{ color: d.color }}>{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-dim rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${analytics?.totalIncidents ? (d.value / analytics.totalIncidents) * 100 : 0}%`,
                            background: d.color,
                          }}
                          role="progressbar"
                          aria-valuenow={d.value}
                        />
                      </div>
                      <span className="text-white w-4 text-right">{d.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row 4: Bar chart by zone ─── */}
      {analytics?.topZones?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5" role="region" aria-label="Incidentes por zona">
          <p className="font-display text-xl tracking-wider text-white mb-5">INCIDENTES POR ZONA</p>
          <div aria-label="Gráfica de barras por zona" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.topZones}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="zone" tick={{ fontSize: 9 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#0a84ff" radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
