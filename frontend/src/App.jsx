import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { WebSocketProvider, useWS } from "./contexts/WebSocketContext";
import MainLayout from "./layouts/MainLayout";
import DashboardPage from "./pages/DashboardPage";
import IncidentManagementPage from "./pages/IncidentManagementPage";
import PredictiveAnalyticsPage from "./pages/PredictiveAnalyticsPage";
import SystemMonitoringPage from "./pages/SystemMonitoringPage";
import LiveAlertsCenterPage from "./pages/LiveAlertsCenterPage";

const SEV_TOAST = {
  CRITICAL: { icon: "🚨", style: { background: "#1a0808", color: "#ff3b3b", border: "1px solid rgba(255,59,59,0.4)" } },
  HIGH:     { icon: "🔴", style: { background: "#1a0e00", color: "#ff9500", border: "1px solid rgba(255,149,0,0.4)" } },
  MEDIUM:   { icon: "🟡", style: { background: "#181500", color: "#ffd60a", border: "1px solid rgba(255,214,10,0.4)" } },
  LOW:      { icon: "🟢", style: { background: "#001610", color: "#00d084", border: "1px solid rgba(0,208,132,0.4)" } },
};

// Isolated component so it can consume context
function ToastHandler() {
  const { lastIncident } = useWS();

  useEffect(() => {
    if (!lastIncident) return;
    const cfg = SEV_TOAST[lastIncident.severity] || SEV_TOAST.LOW;
    toast(`${cfg.icon} ${lastIncident.description} — ${lastIncident.location}`, {
      duration: 5000,
      style: {
        ...cfg.style,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "13px",
        maxWidth: "400px",
      },
    });
  }, [lastIncident]);

  return null;
}

export default function App() {
  return (
    <WebSocketProvider>
      <Toaster position="top-right" />
      <ToastHandler />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="incidents" element={<IncidentManagementPage />} />
          <Route path="analytics" element={<PredictiveAnalyticsPage />} />
          <Route path="monitoring" element={<SystemMonitoringPage />} />
          <Route path="alerts" element={<LiveAlertsCenterPage />} />
        </Route>
      </Routes>
    </WebSocketProvider>
  );
}
