import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Wifi, WifiOff, Filter, Volume2, VolumeX,
  AlertTriangle, MapPin, User, Clock, Zap, Trash2,
} from "lucide-react";
import { useWS } from "../contexts/WebSocketContext";

const SEV_CONFIG = {
  CRITICAL: {
    icon:   "🚨",
    color:  "#ff3b3b",
    bg:     "bg-red-500/10",
    border: "border-red-500/30",
    text:   "text-red-400",
    ring:   "ring-red-500/30",
    label:  "CRÍTICO",
  },
  HIGH: {
    icon:   "🔴",
    color:  "#ff9500",
    bg:     "bg-orange-500/10",
    border: "border-orange-500/30",
    text:   "text-orange-400",
    ring:   "ring-orange-500/30",
    label:  "ALTO",
  },
  MEDIUM: {
    icon:   "🟡",
    color:  "#ffd60a",
    bg:     "bg-yellow-500/10",
    border: "border-yellow-500/30",
    text:   "text-yellow-400",
    ring:   "ring-yellow-500/30",
    label:  "MEDIO",
  },
  LOW: {
    icon:   "🟢",
    color:  "#00d084",
    bg:     "bg-green-500/10",
    border: "border-green-500/30",
    text:   "text-green-400",
    ring:   "ring-green-500/30",
    label:  "BAJO",
  },
};

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60)   return `hace ${s}s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)}m`;
  return `hace ${Math.floor(s / 3600)}h`;
}

// ── Single alert card ─────────────────────────────────────────
function AlertCard({ notif, index }) {
  const inc = notif.incident;
  const sev = inc?.severity || "LOW";
  const cfg = SEV_CONFIG[sev] || SEV_CONFIG.LOW;
  const isCritical = sev === "CRITICAL";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, x: 40, scale: 0.96 }}
      animate={{ opacity: 1, x: 0,  scale: 1 }}
      exit={{ opacity: 0, x: -30, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: index < 3 ? index * 0.04 : 0 }}
      className={`border rounded-2xl p-4 ${cfg.bg} ${cfg.border} ${isCritical ? "ring-1 " + cfg.ring : ""}`}
      role="article"
      aria-label={`Alerta ${sev}: ${inc?.description}`}
    >
      <div className="flex items-start gap-3">
        {/* Severity icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl
                      ${isCritical ? "animate-pulse-fast" : ""}`}
          style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}
          aria-hidden="true"
        >
          {cfg.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm text-white leading-snug">{inc?.description || "Incidente registrado"}</p>
            <span
              className={`flex-shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${cfg.text} ${cfg.border}`}
              style={{ background: `${cfg.color}12` }}
            >
              {sev}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted mt-1.5">
            {inc?.location && (
              <span className="flex items-center gap-1">
                <MapPin size={10} aria-hidden="true" />
                {inc.location}
              </span>
            )}
            {inc?.reportedBy && (
              <span className="flex items-center gap-1">
                <User size={10} aria-hidden="true" />
                {inc.reportedBy}
              </span>
            )}
            <span className="flex items-center gap-1 ml-auto text-dim">
              <Clock size={10} aria-hidden="true" />
              {timeAgo(notif.timestamp || inc?.timestamp)}
            </span>
          </div>

          {isCritical && (
            <div
              className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-red-400"
              role="alert"
            >
              <AlertTriangle size={10} aria-hidden="true" />
              Incidente de máxima prioridad — Respuesta inmediata requerida
            </div>
          )}
        </div>
      </div>

      {/* ID footer */}
      {inc?.id && (
        <p className="text-[10px] font-mono text-dim mt-2 pt-2 border-t border-white/5">
          ID: {inc.id}
        </p>
      )}
    </motion.article>
  );
}

// ── Stats bar ─────────────────────────────────────────────────
function StatsBar({ notifications }) {
  const counts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    notifications.forEach((n) => {
      const sev = n.incident?.severity;
      if (sev in c) c[sev]++;
    });
    return c;
  }, [notifications]);

  return (
    <div className="grid grid-cols-4 gap-3" role="region" aria-label="Conteo por severidad">
      {Object.entries(SEV_CONFIG).map(([sev, cfg]) => (
        <div
          key={sev}
          className={`bg-card border rounded-xl p-3 text-center ${cfg.border}`}
          style={{ boxShadow: `0 0 12px ${cfg.color}15` }}
        >
          <p className="font-display text-3xl tracking-wider" style={{ color: cfg.color }}>
            {counts[sev]}
          </p>
          <p className="text-[10px] font-mono text-muted mt-0.5">{cfg.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function LiveAlertsCenterPage() {
  const { connected, notifications } = useWS();
  const [sevFilter,   setSevFilter]   = useState("ALL");
  const [soundOn,     setSoundOn]     = useState(false);
  const [dismissed,   setDismissed]   = useState(new Set());
  const feedRef       = useRef(null);
  const prevLenRef    = useRef(notifications.length);
  const audioCtxRef   = useRef(null);

  // Auto-scroll to top on new notification
  useEffect(() => {
    if (notifications.length > prevLenRef.current && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
    prevLenRef.current = notifications.length;
  }, [notifications.length]);

  // Sound alert for CRITICAL (browser AudioContext, user-activated)
  useEffect(() => {
    if (!soundOn || !notifications.length) return;
    const last = notifications[0];
    if (last?.incident?.severity !== "CRITICAL") return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // AudioContext not available or not allowed
    }
  }, [notifications, soundOn]);

  const visible = useMemo(() => {
    let list = notifications.filter((n) => !dismissed.has(n.id));
    // Priority sort: CRITICAL first, then HIGH, MEDIUM, LOW, then by time
    const ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    list = list.sort((a, b) => {
      const oa = ORDER[a.incident?.severity] ?? 4;
      const ob = ORDER[b.incident?.severity] ?? 4;
      return oa !== ob ? oa - ob : new Date(b.timestamp) - new Date(a.timestamp);
    });
    if (sevFilter !== "ALL") list = list.filter((n) => n.incident?.severity === sevFilter);
    return list;
  }, [notifications, sevFilter, dismissed]);

  const criticalFeed = visible.filter((n) => n.incident?.severity === "CRITICAL");

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* ── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl tracking-wider text-white flex items-center gap-3">
            <Bell size={28} className="text-accent" aria-hidden="true" />
            LIVE ALERTS CENTER
          </h2>
          <p className="text-xs font-mono text-muted mt-0.5">
            Feed en tiempo real vía WebSocket · {notifications.length} alertas en buffer
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundOn((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-mono
                        transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-info
                        ${soundOn
                          ? "bg-safe/12 border-safe/30 text-safe"
                          : "bg-card border-border text-muted hover:text-white"
                        }`}
            aria-label={soundOn ? "Desactivar sonido de alertas" : "Activar sonido de alertas críticas"}
            aria-pressed={soundOn}
          >
            {soundOn ? <Volume2 size={14} aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" />}
            {soundOn ? "Sonido ON" : "Sonido OFF"}
          </button>

          {/* WS indicator */}
          <div
            className="flex items-center gap-1.5"
            role="status"
            aria-label={connected ? "WebSocket conectado" : "WebSocket desconectado"}
          >
            {connected
              ? <Wifi size={15} className="text-safe" aria-hidden="true" />
              : <WifiOff size={15} className="text-muted" aria-hidden="true" />
            }
            <span className={`text-xs font-mono ${connected ? "text-safe" : "text-muted"}`}>
              {connected ? "LIVE" : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stats ─── */}
      <StatsBar notifications={notifications} />

      {/* ── Critical priority queue ─── */}
      {criticalFeed.length > 0 && (
        <section
          aria-label="Cola de incidentes críticos"
          className="bg-red-500/8 border border-red-500/25 rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-accent animate-pulse-fast" aria-hidden="true" />
            <span className="font-display text-xl tracking-wider text-accent">
              PRIORITY QUEUE — {criticalFeed.length} CRITICAL
            </span>
          </div>
          <div className="space-y-2">
            <AnimatePresence>
              {criticalFeed.slice(0, 3).map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-2.5"
                  role="alert"
                  aria-live="assertive"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg flex-shrink-0" aria-hidden="true">🚨</span>
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{n.incident?.description}</p>
                      <p className="text-xs font-mono text-red-400/70 flex items-center gap-1">
                        <MapPin size={9} aria-hidden="true" />
                        {n.incident?.location} · {timeAgo(n.timestamp || n.incident?.timestamp)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDismissed((prev) => new Set([...prev, n.id]))}
                    className="text-red-400/50 hover:text-red-400 p-1 rounded-lg flex-shrink-0 ml-2
                               focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    aria-label={`Descartar alerta de ${n.incident?.location}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* ── Main feed ─── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Feed header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-night/50">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-muted" aria-hidden="true" />
            <span className="font-display text-xl tracking-wider text-white">ALERT STREAM</span>
            <span className="text-xs font-mono text-dim">
              {visible.length} {sevFilter !== "ALL" ? `(${sevFilter})` : "total"}
            </span>
          </div>

          {/* Severity filter */}
          <div className="flex items-center gap-1.5" role="group" aria-label="Filtrar por severidad">
            <Filter size={12} className="text-muted" aria-hidden="true" />
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => {
              const cfg = SEV_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => setSevFilter(s)}
                  className={`text-[10px] font-mono px-2 py-1 rounded-lg border transition-all
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-info
                             ${sevFilter === s
                               ? s === "ALL"
                                 ? "bg-info/15 border-info/35 text-info"
                                 : `border-current`
                               : "border-border text-dim hover:text-white hover:border-muted/40"
                             }`}
                  style={sevFilter === s && s !== "ALL" ? { color: cfg?.color, borderColor: `${cfg?.color}40`, background: `${cfg?.color}12` } : {}}
                  aria-pressed={sevFilter === s}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Alert list */}
        <div
          ref={feedRef}
          className="overflow-y-auto p-3 space-y-2.5"
          style={{ maxHeight: 520 }}
          role="feed"
          aria-label="Lista de alertas en tiempo real"
          aria-live="polite"
        >
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Zap size={32} className="text-dim" aria-hidden="true" />
              </motion.div>
              <div>
                <p className="text-muted text-sm">
                  {connected ? "Esperando alertas..." : "WebSocket desconectado"}
                </p>
                <p className="text-dim text-xs font-mono mt-1">
                  {connected
                    ? "Los incidentes aparecerán aquí en tiempo real"
                    : "Reconectando automáticamente cada 3s..."
                  }
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {visible.map((n, i) => (
                <AlertCard key={n.id || i} notif={n} index={i} />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-night/30 flex items-center justify-between">
          <p className="text-xs font-mono text-dim">
            Buffer: {notifications.length} / 50 notificaciones
          </p>
          {dismissed.size > 0 && (
            <button
              onClick={() => setDismissed(new Set())}
              className="text-xs font-mono text-muted hover:text-white transition-colors
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-info rounded"
              aria-label={`Restaurar ${dismissed.size} alertas descartadas`}
            >
              Restaurar {dismissed.size} descartada{dismissed.size !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
