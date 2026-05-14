import { createContext, useContext } from "react";
import { useWebSocket } from "../hooks/useWebSocket";

const WSContext = createContext(null);

export function WebSocketProvider({ children }) {
  const ws = useWebSocket();
  return <WSContext.Provider value={ws}>{children}</WSContext.Provider>;
}

export function useWS() {
  const ctx = useContext(WSContext);
  if (!ctx) throw new Error("useWS must be used within WebSocketProvider");
  return ctx;
}
