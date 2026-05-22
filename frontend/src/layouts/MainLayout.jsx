import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertOctagon, LayoutDashboard, Siren,
  BrainCircuit, Activity, Bell, Radio,
  Menu, X, ChevronRight,
} from "lucide-react";
import { useWS } from "../contexts/WebSocketContext";

const NAV_ITEMS = [
  { to: "/",           icon: LayoutDashboard, label: "Dashboard",              end: true  },
  { to: "/incidents",  icon: Siren,           label: "Incident Management",    end: false },
  { to: "/analytics",  icon: BrainCircuit,    label: "Predictive Analytics",   end: false },
  { to: "/monitoring", icon: Activity,        label: "System Monitoring",      end: false },
  { to: "/alerts",     icon: Bell,            label: "Live Alerts Center",     end: false },
];

const ARCH_CHIPS = [
  ["React + Vite",           "#61DAFB"],
  ["API Gateway :3001",      "#0a84ff"],
  ["Incident Svc :3002",     "#ff9500"],
  ["Notification :3003 (WS)","#00d084"],
  ["Analytics :3004",        "#bf5af2"],
  ["MQTT :1883",             "#ff3b3b"],
];

export default function MainLayout() {
  const { connected, notifications } = useWS();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const criticalCount = notifications.filter((n) => n.incident?.severity === "CRITICAL").length;
  const currentLabel =
    NAV_ITEMS.find((item) =>
      item.end
        ? location.pathname === item.to
        : location.pathname.startsWith(item.to)
    )?.label ?? "Dashboard";

  return (
    <div className="flex min-h-screen bg-night">
      {/* ── Skip link (accessibility) ─────── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200]
                   focus:bg-info focus:text-white focus:px-4 focus:py-2 focus:rounded-lg
                   focus:font-mono focus:text-sm focus:shadow-lg"
      >
        Saltar al contenido principal
      </a>

      {/* ── Mobile backdrop ───────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ───────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-panel border-r border-border
                    flex flex-col transition-transform duration-250 ease-in-out
                    lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Navegación principal"
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border flex-shrink-0">
          <div
            className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center glow-red flex-shrink-0"
            aria-hidden="true"
          >
            <AlertOctagon size={18} className="text-white" />
          </div>
          <div>
            <p className="font-display text-xl tracking-[0.12em] text-white leading-none">
              CAMPUS<span className="text-accent">ALERT</span>
            </p>
            <p className="text-[10px] font-mono text-muted leading-none mt-0.5">
              Distributed Emergency System
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto" aria-label="Menú principal">
          <p className="text-[10px] font-mono text-muted uppercase tracking-widest px-3 mb-2">
            Navegación
          </p>
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body
                 transition-all duration-150 group
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-info
                 focus-visible:ring-offset-1 focus-visible:ring-offset-panel
                 ${isActive
                   ? "bg-accent/12 text-white border border-accent/25"
                   : "text-muted hover:text-white hover:bg-white/5"
                 }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={15}
                    className={isActive ? "text-accent" : "group-hover:text-white transition-colors"}
                    aria-hidden="true"
                  />
                  <span className="flex-1 leading-none">{label}</span>

                  {/* Alert badge on Live Alerts */}
                  {label === "Live Alerts Center" && notifications.length > 0 && (
                    <span
                      className="text-[10px] font-mono bg-accent/20 text-accent border border-accent/30
                                 rounded-full px-1.5 py-0.5 leading-none"
                      aria-label={`${notifications.length} alertas`}
                    >
                      {notifications.length}
                    </span>
                  )}

                  {isActive && (
                    <ChevronRight size={12} className="text-accent flex-shrink-0" aria-hidden="true" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* WS Status */}
        <div className="border-t border-border px-5 py-4 flex-shrink-0">
          <div
            className="flex items-center gap-2"
            role="status"
            aria-live="polite"
            aria-label={connected ? "WebSocket conectado" : "WebSocket desconectado"}
          >
            <Radio
              size={11}
              className={connected ? "text-safe animate-pulse-fast" : "text-muted"}
              aria-hidden="true"
            />
            <span className={`text-xs font-mono ${connected ? "text-safe" : "text-muted"}`}>
              {connected ? "WebSocket LIVE" : "Desconectado"}
            </span>
          </div>
          <p className="text-[10px] font-mono text-muted mt-1.5">
            MQTT · WebSocket · 4 microservicios
          </p>
        </div>
      </aside>

      {/* ── Content area ──────────────────── */}
      <div className="flex-1 flex flex-col lg:ml-60 min-w-0">

        {/* Top navbar */}
        <header
          className="sticky top-0 z-30 bg-panel/80 backdrop-blur-sm border-b border-border flex-shrink-0"
          role="banner"
        >
          <div className="flex items-center justify-between px-4 py-3 gap-3">

            {/* Hamburger + breadcrumb */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="lg:hidden text-muted hover:text-white p-1.5 rounded-lg transition-colors
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-info flex-shrink-0"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={open}
                aria-controls="sidebar"
              >
                {open ? <X size={18} /> : <Menu size={18} />}
              </button>
              <p className="text-xs font-mono text-white truncate">
                <span className="text-muted hidden sm:inline">CampusAlert / </span>
                {currentLabel}
              </p>
            </div>

            {/* Status chips */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {criticalCount > 0 && (
                <div
                  className="flex items-center gap-1.5 bg-accent/12 border border-accent/30
                             rounded-lg px-2.5 py-1 alert-ring"
                  role="status"
                  aria-live="assertive"
                  aria-label={`${criticalCount} incidente${criticalCount !== 1 ? "s" : ""} crítico${criticalCount !== 1 ? "s" : ""}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-fast" aria-hidden="true" />
                  <span className="text-xs font-mono text-accent">
                    {criticalCount} CRÍTICO{criticalCount !== 1 ? "S" : ""}
                  </span>
                </div>
              )}
              <div
                className="flex items-center gap-1.5"
                role="status"
                aria-label={connected ? "WebSocket conectado en vivo" : "WebSocket desconectado"}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-safe animate-pulse-fast" : "bg-muted"}`}
                  aria-hidden="true"
                />
                <span className={`text-xs font-mono hidden sm:block ${connected ? "text-safe" : "text-muted"}`}>
                  {connected ? "LIVE" : "OFFLINE"}
                </span>
              </div>
            </div>
          </div>

          {/* Critical ticker */}
          {notifications.some((n) => n.incident?.severity === "CRITICAL") && (
            <div
              className="bg-accent/90 text-white overflow-hidden py-1.5"
              role="alert"
              aria-live="assertive"
              aria-label="Alerta crítica activa"
            >
              <div className="ticker-inner inline-flex gap-12">
                {[...Array(2)].map((_, i) =>
                  notifications
                    .filter((n) => n.incident?.severity === "CRITICAL")
                    .slice(0, 5)
                    .map((n, j) => (
                      <span
                        key={`${i}-${j}`}
                        className="text-xs font-mono font-bold tracking-widest"
                      >
                        🚨 CRÍTICO: {n.incident?.description} — {n.incident?.location}
                      </span>
                    ))
                )}
              </div>
            </div>
          )}
        </header>

        {/* Page outlet */}
        <main
          id="main-content"
          className="flex-1 overflow-auto focus:outline-none"
          tabIndex={-1}
        >
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-2.5 px-4 flex-shrink-0" role="contentinfo">
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
            {ARCH_CHIPS.map(([name, color]) => (
              <span key={name} className="text-[10px] font-mono" style={{ color }}>
                ⬡ {name}
              </span>
            ))}
          </div>
          <p className="text-center text-muted text-[10px] font-mono mt-1">
            Arquitectura distribuida · Comunicación asíncrona vía MQTT · Pruebas de carga con jMeter
          </p>
        </footer>
      </div>
    </div>
  );
}
