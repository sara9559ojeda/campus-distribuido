import { useEffect, useState } from "react";
import { List, RefreshCw } from "lucide-react";
import { fetchIncidents } from "../lib/api";

const SEV_BADGE = {
  CRITICAL: "severity-CRITICAL bg-severity-CRITICAL",
  HIGH: "severity-HIGH bg-severity-HIGH",
  MEDIUM: "severity-MEDIUM bg-severity-MEDIUM",
  LOW: "severity-LOW bg-severity-LOW",
};

function timeStr(ts) {
  return new Date(ts).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function IncidentList({ refresh }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchIncidents({ limit: 20 });
      setData(res);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [refresh]);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <List size={15} className="text-muted" />
          <span className="font-display text-xl tracking-widest text-white">REGISTRO</span>
          {data && (
            <span className="text-xs font-mono text-muted">({data.total} total)</span>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-muted hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="overflow-y-auto max-h-72">
        {!data || data.incidents.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-muted text-sm font-mono">
            Sin incidentes registrados
          </div>
        ) : (
          data.incidents.map((inc) => (
            <div
              key={inc.id}
              className="flex items-start gap-3 px-5 py-3 border-b border-border/50 hover:bg-night/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{inc.description}</p>
                <p className="text-xs text-muted font-mono mt-0.5">
                  {inc.location} · {inc.reportedBy || "anon"} · {timeStr(inc.timestamp)}
                </p>
              </div>
              <div className="flex-shrink-0 flex flex-col items-end gap-1">
                <span className={`text-xs font-mono font-bold border rounded px-1.5 py-0.5 ${SEV_BADGE[inc.severity] || ""}`}>
                  {inc.severity}
                </span>
                <span className="text-xs font-mono text-dim">{inc.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
