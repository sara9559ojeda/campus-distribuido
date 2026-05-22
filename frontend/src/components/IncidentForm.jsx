import { useState } from "react";
import { AlertTriangle, Send, MapPin, User } from "lucide-react";
import { reportIncident } from "../lib/api";

const LOCATIONS = [
  "Edificio A", "Edificio B", "Edificio C",
  "Cafetería Central", "Laboratorio de Cómputo",
  "Biblioteca", "Parking Sur", "Cancha Deportiva",
  "Auditorio", "Bloque Administrativo",
];

const SEVERITIES = [
  { value: "LOW", label: "Bajo", color: "text-green-400 border-green-400/40 bg-green-400/10" },
  { value: "MEDIUM", label: "Medio", color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10" },
  { value: "HIGH", label: "Alto", color: "text-orange-400 border-orange-400/40 bg-orange-400/10" },
  { value: "CRITICAL", label: "Crítico", color: "text-red-400 border-red-400/40 bg-red-400/10" },
];

export default function IncidentForm({ onSuccess }) {
  const [form, setForm] = useState({
    description: "",
    location: "",
    severity: "MEDIUM",
    reportedBy: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.location) {
      setError("Descripción y ubicación son requeridas.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await reportIncident(form);
      onSuccess?.(result.incident);
      setForm({ description: "", location: "", severity: "MEDIUM", reportedBy: "" });
    } catch (err) {
      setError("Error al enviar el reporte. Verifica que los servicios estén activos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
          <AlertTriangle size={18} className="text-accent" />
        </div>
        <div>
          <h2 className="font-display text-2xl text-white tracking-wider">REPORTAR INCIDENTE</h2>
          <p className="text-xs text-muted font-mono">Evento distribuido vía MQTT</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Description */}
        <div>
          <label htmlFor="incident-description" className="block text-xs font-mono text-muted mb-2 uppercase tracking-widest">
            Descripción del incidente
          </label>
          <textarea
            id="incident-description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ej: Persona herida en el pasillo principal..."
            rows={3}
            className="w-full bg-night border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-muted resize-none focus:outline-none focus:border-accent/60 transition-colors font-body"
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="incident-location" className="block text-xs font-mono text-muted mb-2 uppercase tracking-widest">
            <MapPin size={11} className="inline mr-1" aria-hidden="true" />Ubicación
          </label>
          <select
            id="incident-location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full bg-night border border-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent/60 transition-colors appearance-none cursor-pointer"
          >
            <option value="">Selecciona una ubicación</option>
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        {/* Severity */}
        <div>
          <p id="severity-label" className="block text-xs font-mono text-muted mb-2 uppercase tracking-widest">
            Nivel de severidad
          </p>
          <div className="grid grid-cols-4 gap-2" role="group" aria-labelledby="severity-label">
            {SEVERITIES.map(({ value, label, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm({ ...form, severity: value })}
                aria-pressed={form.severity === value}
                className={`border rounded-lg py-2 text-xs font-mono font-medium transition-all ${color} ${
                  form.severity === value ? "ring-2 ring-offset-1 ring-offset-card" : "opacity-50 hover:opacity-80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Reporter */}
        <div>
          <label htmlFor="incident-reporter" className="block text-xs font-mono text-muted mb-2 uppercase tracking-widest">
            <User size={11} className="inline mr-1" aria-hidden="true" />Reportado por (opcional)
          </label>
          <input
            id="incident-reporter"
            type="text"
            value={form.reportedBy}
            onChange={(e) => setForm({ ...form, reportedBy: e.target.value })}
            placeholder="Nombre o código estudiantil"
            className="w-full bg-night border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-muted focus:outline-none focus:border-accent/60 transition-colors"
          />
        </div>

        {error && (
          <p className="text-accent text-xs font-mono bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
            ⚠ {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-display tracking-widest text-lg rounded-xl py-3 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          {loading ? (
            <span className="font-mono text-sm animate-pulse">ENVIANDO...</span>
          ) : (
            <>
              <Send size={16} />
              ENVIAR ALERTA
            </>
          )}
        </button>
      </form>
    </div>
  );
}
