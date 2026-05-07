import { useEffect, useState } from "react";
import { Server, Activity } from "lucide-react";
import { checkHealth } from "../lib/api";

export default function ServiceStatus() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    const run = async () => {
      const results = await checkHealth();
      setServices(results);
    };
    run();
    const interval = setInterval(run, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Server size={15} className="text-muted" />
        <span className="font-display text-xl tracking-widest text-white">MICROSERVICIOS</span>
      </div>

      <div className="space-y-2">
        {services.length === 0 ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-dim rounded-lg animate-pulse" />
          ))
        ) : (
          services.map((svc) => (
            <div
              key={svc.name}
              className="flex items-center justify-between bg-night border border-border rounded-lg px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    svc.status === "ok" ? "bg-safe animate-pulse-fast" : "bg-accent"
                  }`}
                />
                <span className="text-sm text-white font-body">{svc.name}</span>
              </div>
              <div className="flex items-center gap-3">
                {svc.status === "ok" && svc.data?.uptime !== undefined && (
                  <span className="text-xs font-mono text-dim hidden sm:block">
                    {Math.floor(svc.data.uptime)}s up
                  </span>
                )}
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded ${
                    svc.status === "ok"
                      ? "text-safe bg-safe/10"
                      : "text-accent bg-accent/10"
                  }`}
                >
                  :{svc.port} {svc.status === "ok" ? "OK" : "DOWN"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs font-mono text-dim">
        <Activity size={11} />
        <span>Arquitectura distribuida · MQTT broker + 4 microservicios</span>
      </div>
    </div>
  );
}
