import { createContext, useContext, useMemo } from "react";
import { useWebSocket } from "../hooks/useWebSocket";

const WSContext = createContext(null);

export function WebSocketProvider({ children }) {
  const ws = useWebSocket();

  // The incident-service publishes each incident to TWO MQTT topics:
  //   campus/incidents/{severity}  AND  campus/incidents/all
  // The notification-service subscribes to campus/incidents/# (wildcard),
  // so it receives both messages and forwards both via WebSocket.
  // We deduplicate here by incident ID so every component in the app
  // counts correctly without touching the original hook.
  const notifications = useMemo(() => {
    const seen = new Set();
    return ws.notifications.filter((n) => {
      const id = n.incident?.id ?? n.id;
      if (!id) return true;          // keep notifications with no ID (shouldn't happen)
      if (seen.has(id)) return false; // drop duplicate
      seen.add(id);
      return true;
    });
  }, [ws.notifications]);

  return (
    <WSContext.Provider value={{ ...ws, notifications }}>
      {children}
    </WSContext.Provider>
  );
}

export function useWS() {
  const ctx = useContext(WSContext);
  if (!ctx) throw new Error("useWS must be used within WebSocketProvider");
  return ctx;
}
