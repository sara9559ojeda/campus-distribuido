import { useEffect, useRef } from "react";
import { Bell, Wifi, WifiOff, Zap } from "lucide-react";

const SEVERITY_ICONS = {
  CRITICAL: "🚨",
  HIGH: "🔴",
  MEDIUM: "🟡",
  LOW: "🟢",
};

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `hace ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m}m`;
  return `hace ${Math.floor(m / 60)}h`;
}

export default function LiveFeed({ notifications, connected }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current && notifications.length > 0) {
      listRef.current.scrollTop = 0;
    }
  }, [notifications.length]);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col" style={{ height: 480 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-night/50">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-muted" />
          <span className="font-display text-xl tracking-widest text-white">ALERTAS EN VIVO</span>
          {notifications.length > 0 && (
            <span className="text-xs font-mono bg-accent/20 text-accent border border-accent/30 rounded px-1.5 py-0.5">
              {notifications.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <div className="w-2 h-2 rounded-full bg-safe animate-pulse-fast" />
              <span className="text-xs font-mono text-safe flex items-center gap-1">
                <Wifi size={11} /> WS LIVE
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-muted" />
              <span className="text-xs font-mono text-muted flex items-center gap-1">
                <WifiOff size={11} /> OFFLINE
              </span>
            </>
          )}
        </div>
      </div>

      {/* Feed */}
      <div ref={listRef} className="overflow-y-auto flex-1 p-3 space-y-2">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <Zap size={28} className="text-dim" />
            <div>
              <p className="text-muted text-sm">Sin alertas aún</p>
              <p className="text-dim text-xs font-mono mt-1">
                {connected ? "Escuchando eventos MQTT..." : "Conectando al servidor..."}
              </p>
            </div>
          </div>
        ) : (
          notifications.map((notif, i) => {
            const inc = notif.incident;
            const sev = inc?.severity || "LOW";
            return (
              <div
                key={notif.id || i}
                className={`border rounded-xl p-3 animate-slide-in bg-severity-${sev}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0">{SEVERITY_ICONS[sev] || "⚪"}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate leading-snug">
                        {inc?.description || "Incidente registrado"}
                      </p>
                      <p className="text-xs text-muted mt-0.5 font-mono">
                        📍 {inc?.location || "—"} · {inc?.reportedBy || "anon"}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className={`text-xs font-mono font-bold severity-${sev}`}>{sev}</span>
                    <p className="text-xs text-dim font-mono mt-0.5">
                      {timeAgo(notif.timestamp || inc?.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
