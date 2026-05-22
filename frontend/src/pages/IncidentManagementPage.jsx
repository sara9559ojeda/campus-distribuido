import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, RefreshCw, X, ChevronUp, ChevronDown,
  MapPin, User, Clock, FileText, Filter, AlertTriangle,
} from "lucide-react";
import { fetchIncidents, updateIncidentStatus } from "../services/api";
import { useWS } from "../contexts/WebSocketContext";
import { toast } from "react-hot-toast";

const SEVERITY_OPTIONS = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
const STATUS_OPTIONS   = ["ALL", "ACTIVE", "RESOLVED", "INVESTIGATING"];
const LOCATIONS = [
  "Edificio A", "Edificio B", "Edificio C", "Cafetería Central",
  "Laboratorio de Cómputo", "Biblioteca", "Parking Sur",
  "Cancha Deportiva", "Auditorio", "Bloque Administrativo",
];

const SEV_COLORS = {
  CRITICAL: { text: "text-red-400",    bg: "bg-red-400/10",    border: "border-red-400/30"    },
  HIGH:     { text: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30" },
  MEDIUM:   { text: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30" },
  LOW:      { text: "text-green-400",  bg: "bg-green-400/10",  border: "border-green-400/30"  },
};

function timeStr(ts) {
  return new Date(ts).toLocaleString("es-CO", {
    month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function SeverityBadge({ severity }) {
  const c = SEV_COLORS[severity] || SEV_COLORS.LOW;
  return (
    <span className={`text-xs font-mono font-bold border rounded px-2 py-0.5 ${c.text} ${c.bg} ${c.border}`}>
      {severity}
    </span>
  );
}

/* ── Incident detail modal ─────────────────────────────────── */
function IncidentModal({ incident, onClose, onStatusUpdate }) {
  const [updating, setUpdating] = useState(false);
  const [status,   setStatus]   = useState(incident.status);

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await onStatusUpdate(incident.id, newStatus);
      setStatus(newStatus);
      toast.success(`Estado actualizado: ${newStatus}`, {
        style: { background: "#111318", color: "#00d084", border: "1px solid rgba(0,208,132,0.3)" },
      });
    } catch {
      toast.error("Error al actualizar estado");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle del incidente ${incident.id}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-panel border border-border rounded-2xl p-6 w-full max-w-lg shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/12 border border-accent/25 flex items-center justify-center">
              <AlertTriangle size={18} className="text-accent" aria-hidden="true" />
            </div>
            <div>
              <p className="font-display text-xl tracking-wider text-white">INCIDENTE</p>
              <p className="text-xs font-mono text-muted">{incident.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-white p-1.5 rounded-lg transition-colors
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-info"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4">
          <div className="bg-night border border-border rounded-xl p-4">
            <p className="text-sm text-muted font-mono mb-1 uppercase tracking-widest">Descripción</p>
            <p className="text-white text-sm">{incident.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-night border border-border rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-muted text-xs font-mono mb-1">
                <MapPin size={10} aria-hidden="true" /> Ubicación
              </div>
              <p className="text-white text-sm">{incident.location}</p>
            </div>
            <div className="bg-night border border-border rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-muted text-xs font-mono mb-1">
                <User size={10} aria-hidden="true" /> Reportado por
              </div>
              <p className="text-white text-sm">{incident.reportedBy || "Anónimo"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-night border border-border rounded-xl p-3">
              <p className="text-muted text-xs font-mono mb-1 uppercase tracking-widest">Severidad</p>
              <SeverityBadge severity={incident.severity} />
            </div>
            <div className="bg-night border border-border rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-muted text-xs font-mono mb-1">
                <Clock size={10} aria-hidden="true" /> Timestamp
              </div>
              <p className="text-white text-xs font-mono">{timeStr(incident.timestamp)}</p>
            </div>
          </div>

          {/* Status update */}
          <div>
            <p className="text-muted text-xs font-mono mb-2 uppercase tracking-widest">Actualizar estado</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.filter((s) => s !== "ALL").map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={updating || status === s}
                  className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-info
                             disabled:opacity-40 disabled:cursor-not-allowed
                             ${status === s
                               ? "bg-safe/15 border-safe/35 text-safe"
                               : "border-border text-muted hover:text-white hover:border-border/80"
                             }`}
                  aria-pressed={status === s}
                >
                  {updating && status === s ? "..." : s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Sort indicator ────────────────────────────────────────── */
function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronUp size={12} className="text-muted opacity-40" aria-hidden="true" />;
  return sortDir === "asc"
    ? <ChevronUp size={12} className="text-info" aria-hidden="true" />
    : <ChevronDown size={12} className="text-info" aria-hidden="true" />;
}

/* ── Main page ─────────────────────────────────────────────── */
export default function IncidentManagementPage() {
  const { notifications } = useWS();
  const [incidents,    setIncidents]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [sevFilter,    setSevFilter]    = useState("ALL");
  const [locFilter,    setLocFilter]    = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortField,    setSortField]    = useState("timestamp");
  const [sortDir,      setSortDir]      = useState("desc");
  const [selected,     setSelected]     = useState(null);
  const [newIds,       setNewIds]       = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchIncidents({ limit: 100 });
      setIncidents(res.incidents || []);
    } catch {
      toast.error("Error cargando incidentes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Highlight new incidents from WS
  useEffect(() => {
    if (!notifications.length) return;
    const last = notifications[0];
    if (!last?.incident?.id) return;
    const id = last.incident.id;
    setNewIds((prev) => new Set([...prev, id]));
    setIncidents((prev) => {
      if (prev.some((i) => i.id === id)) return prev;
      return [last.incident, ...prev];
    });
    const timer = setTimeout(() => {
      setNewIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }, 8000);
    return () => clearTimeout(timer);
  }, [notifications]);

  const handleStatusUpdate = useCallback(async (id, status) => {
    await updateIncidentStatus(id, status);
    setIncidents((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
  }, []);

  const handleSort = (field) => {
    setSortDir((d) => sortField === field ? (d === "asc" ? "desc" : "asc") : "desc");
    setSortField(field);
  };

  const filtered = useMemo(() => {
    let list = [...incidents];
    if (sevFilter !== "ALL")    list = list.filter((i) => i.severity === sevFilter);
    if (locFilter !== "ALL")    list = list.filter((i) => i.location === locFilter);
    if (statusFilter !== "ALL") list = list.filter((i) => i.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.description?.toLowerCase().includes(q) ||
          i.location?.toLowerCase().includes(q) ||
          i.reportedBy?.toLowerCase().includes(q) ||
          i.id?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === "timestamp") { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1  : -1;
      return 0;
    });
    return list;
  }, [incidents, sevFilter, locFilter, statusFilter, search, sortField, sortDir]);

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* ── Page header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl tracking-wider text-white">INCIDENT MANAGEMENT</h2>
          <p className="text-xs font-mono text-muted mt-0.5">
            {filtered.length} incidentes · actualizado en tiempo real vía WebSocket
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl
                     text-sm text-muted hover:text-white transition-colors
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-info
                     disabled:opacity-50"
          aria-label="Recargar incidentes"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* ── Filters ─── */}
      <div
        className="bg-card border border-border rounded-2xl p-4 space-y-4"
        role="search"
        aria-label="Filtros de incidentes"
      >
        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descripción, ubicación, reportero o ID..."
            className="w-full bg-night border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white
                       placeholder-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-info
                       focus:border-info/50 transition-colors"
            aria-label="Buscar incidentes"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
              aria-label="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-1.5">
            <Filter size={12} className="text-muted" aria-hidden="true" />
            <span className="text-xs font-mono text-muted">Severidad:</span>
            <div className="flex gap-1" role="group" aria-label="Filtro por severidad">
              {SEVERITY_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSevFilter(s)}
                  className={`text-xs font-mono px-2.5 py-1 rounded-lg border transition-all
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-info
                             ${sevFilter === s
                               ? "bg-info/15 border-info/35 text-info"
                               : "border-border text-muted hover:text-white hover:border-muted/40"
                             }`}
                  aria-pressed={sevFilter === s}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-muted">Estado:</span>
            <div className="flex gap-1" role="group" aria-label="Filtro por estado">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs font-mono px-2.5 py-1 rounded-lg border transition-all
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-info
                             ${statusFilter === s
                               ? "bg-safe/12 border-safe/30 text-safe"
                               : "border-border text-muted hover:text-white hover:border-muted/40"
                             }`}
                  aria-pressed={statusFilter === s}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <MapPin size={12} className="text-muted" aria-hidden="true" />
            <label htmlFor="locFilter" className="text-xs font-mono text-muted sr-only">
              Filtro por ubicación
            </label>
            <select
              id="locFilter"
              value={locFilter}
              onChange={(e) => setLocFilter(e.target.value)}
              className="bg-night border border-border rounded-lg px-2.5 py-1 text-xs font-mono text-white
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-info appearance-none cursor-pointer"
            >
              <option value="ALL">Todas las zonas</option>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Table ─── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="grid" aria-label="Lista de incidentes">
            <thead>
              <tr className="border-b border-border bg-night/60">
                {[
                  { label: "Descripción",  field: "description" },
                  { label: "Ubicación",    field: "location"    },
                  { label: "Severidad",    field: "severity"    },
                  { label: "Estado",       field: "status"      },
                  { label: "Reportado por",field: "reportedBy"  },
                  { label: "Timestamp",    field: "timestamp"   },
                ].map(({ label, field }) => (
                  <th
                    key={field}
                    className="text-left px-4 py-3 text-xs font-mono text-muted uppercase tracking-widest
                               cursor-pointer hover:text-white transition-colors select-none
                               focus:outline-none focus-visible:ring-2 focus-visible:ring-info"
                    onClick={() => handleSort(field)}
                    onKeyDown={(e) => e.key === "Enter" && handleSort(field)}
                    tabIndex={0}
                    role="columnheader"
                    aria-sort={sortField === field ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-xs font-mono text-muted uppercase tracking-widest text-right">
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && incidents.length === 0 ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-dim/50 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted font-mono text-sm">
                    <FileText size={28} className="mx-auto mb-2 text-muted" aria-hidden="true" />
                    Sin incidentes para los filtros actuales
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filtered.map((inc) => (
                    <motion.tr
                      key={inc.id}
                      layout
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`border-b border-border/40 hover:bg-night/50 transition-colors cursor-pointer
                                  ${newIds.has(inc.id) ? "bg-info/5 border-l-2 border-l-info" : ""}`}
                      onClick={() => setSelected(inc)}
                      onKeyDown={(e) => e.key === "Enter" && setSelected(inc)}
                      tabIndex={0}
                      role="row"
                      aria-label={`Incidente ${inc.id}: ${inc.description}`}
                    >
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-white truncate">{inc.description}</p>
                        <p className="text-xs text-muted font-mono mt-0.5">{inc.id?.slice(0, 8)}...</p>
                      </td>
                      <td className="px-4 py-3 text-muted font-mono text-xs">
                        <div className="flex items-center gap-1">
                          <MapPin size={10} aria-hidden="true" />
                          {inc.location}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <SeverityBadge severity={inc.severity} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-muted">
                          {inc.status || "ACTIVE"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted font-mono text-xs">
                        {inc.reportedBy || "anon"}
                      </td>
                      <td className="px-4 py-3 text-muted font-mono text-xs whitespace-nowrap">
                        <span title={timeStr(inc.timestamp)}>{timeAgo(inc.timestamp)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelected(inc); }}
                          className="text-info hover:text-white text-xs font-mono px-2.5 py-1
                                     border border-info/30 hover:border-white/30 rounded-lg transition-colors
                                     focus:outline-none focus-visible:ring-2 focus-visible:ring-info"
                          aria-label={`Ver detalle del incidente ${inc.id}`}
                        >
                          Ver
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="px-4 py-3 border-t border-border bg-night/30 flex items-center justify-between">
          <p className="text-xs font-mono text-muted">
            Mostrando {filtered.length} de {incidents.length} incidentes
          </p>
          {newIds.size > 0 && (
            <p className="text-xs font-mono text-info animate-pulse-fast">
              {newIds.size} nuevo{newIds.size !== 1 ? "s" : ""} vía WebSocket
            </p>
          )}
        </div>
      </div>

      {/* ── Modal ─── */}
      <AnimatePresence>
        {selected && (
          <IncidentModal
            incident={selected}
            onClose={() => setSelected(null)}
            onStatusUpdate={handleStatusUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
