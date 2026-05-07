import { useEffect, useState } from "react";
import { BarChart2, TrendingUp, Clock, Shield } from "lucide-react";
import { fetchAnalytics } from "../lib/api";

const SEV_COLORS = {
  CRITICAL: "#ff3b3b",
  HIGH: "#ff9500",
  MEDIUM: "#ffd60a",
  LOW: "#00d084",
};

function StatCard({ icon: Icon, label, value, sub, color = "#0a84ff" }) {
  return (
    <div className="bg-night border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-muted uppercase tracking-widest">{label}</span>
        <Icon size={14} style={{ color }} />
      </div>
      <p className="font-display text-3xl tracking-wider" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-dim font-mono mt-1">{sub}</p>}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await fetchAnalytics();
      setAnalytics(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 animate-pulse">
        <div className="h-4 bg-dim rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-dim rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const sev = analytics?.bySeverity || {};
  const total = analytics?.totalIncidents || 0;
  const zones = analytics?.topZones || [];

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <BarChart2 size={16} className="text-info" />
        <span className="font-display text-xl tracking-widest text-white">ANALYTICS</span>
        <span className="text-xs font-mono text-dim ml-auto">Auto-refresh 5s</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard
          icon={Shield}
          label="Total Incidentes"
          value={total}
          sub="desde inicio"
          color="#0a84ff"
        />
        <StatCard
          icon={Clock}
          label="T. Respuesta avg"
          value={`${analytics?.avgResponseTime || 0}ms`}
          sub="promedio sistema"
          color="#00d084"
        />
        <StatCard
          icon={TrendingUp}
          label="Críticos"
          value={sev.CRITICAL || 0}
          sub="prioridad máxima"
          color="#ff3b3b"
        />
        <StatCard
          icon={TrendingUp}
          label="Altos"
          value={sev.HIGH || 0}
          sub="requieren atención"
          color="#ff9500"
        />
      </div>

      {/* Severity bar */}
      {total > 0 && (
        <div className="mb-5">
          <p className="text-xs font-mono text-muted mb-2 uppercase tracking-widest">Distribución por severidad</p>
          <div className="flex rounded-lg overflow-hidden h-3 gap-0.5">
            {Object.entries(sev).map(([k, v]) =>
              v > 0 ? (
                <div
                  key={k}
                  style={{
                    width: `${(v / total) * 100}%`,
                    backgroundColor: SEV_COLORS[k],
                    minWidth: 4,
                  }}
                  title={`${k}: ${v}`}
                />
              ) : null
            )}
          </div>
          <div className="flex gap-3 mt-2">
            {Object.entries(SEV_COLORS).map(([k, c]) => (
              <span key={k} className="text-xs font-mono flex items-center gap-1" style={{ color: c }}>
                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: c }} />
                {k} ({sev[k] || 0})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top zones */}
      {zones.length > 0 && (
        <div>
          <p className="text-xs font-mono text-muted mb-2 uppercase tracking-widest">Zonas críticas</p>
          <div className="space-y-2">
            {zones.map(({ zone, count, percentage }) => (
              <div key={zone} className="flex items-center gap-2">
                <span className="text-xs text-white w-36 truncate font-body">{zone}</span>
                <div className="flex-1 bg-dim rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-muted w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {total === 0 && (
        <p className="text-center text-muted text-sm py-4 font-mono">Sin datos de analytics aún</p>
      )}
    </div>
  );
}
