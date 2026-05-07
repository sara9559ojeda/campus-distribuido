const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mqtt = require("mqtt");
const { WebSocketServer } = require("ws");
const http = require("http");

const app = express();
const PORT = process.env.PORT || 3003;
const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://localhost:1883";

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// HTTP server for both REST + WS
const server = http.createServer(app);

// WebSocket server — frontend connects here for real-time alerts
const wss = new WebSocketServer({ server, path: "/ws" });

const connectedClients = new Set();

wss.on("connection", (ws, req) => {
  const clientId = `client-${Date.now()}`;
  ws.clientId = clientId;
  connectedClients.add(ws);

  console.log(`[Notification] WS client connected: ${clientId} | Total: ${connectedClients.size}`);

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: "CONNECTED",
      message: "Connected to Campus Alert notification stream",
      timestamp: new Date().toISOString(),
    })
  );

  ws.on("close", () => {
    connectedClients.delete(ws);
    console.log(`[Notification] WS client disconnected: ${clientId} | Total: ${connectedClients.size}`);
  });

  ws.on("error", (err) => {
    console.error(`[Notification] WS error for ${clientId}:`, err.message);
    connectedClients.delete(ws);
  });
});

function broadcast(data) {
  const message = JSON.stringify(data);
  let sent = 0;
  connectedClients.forEach((client) => {
    if (client.readyState === 1) {
      // OPEN
      client.send(message);
      sent++;
    }
  });
  return sent;
}

// Notification log (in-memory)
const notifications = [];

// MQTT — subscribe to all campus incident topics
const mqttClient = mqtt.connect(MQTT_BROKER, {
  clientId: `notification-service-${Date.now()}`,
  reconnectPeriod: 3000,
});

mqttClient.on("connect", () => {
  console.log("[Notification] Connected to MQTT broker");
  mqttClient.subscribe("campus/incidents/#", { qos: 1 }, (err) => {
    if (err) console.error("[Notification] Subscribe error:", err.message);
    else console.log("[Notification] Subscribed to campus/incidents/#");
  });
});

mqttClient.on("message", (topic, message) => {
  try {
    const incident = JSON.parse(message.toString());

    const notification = {
      id: `notif-${Date.now()}`,
      type: "INCIDENT_ALERT",
      topic,
      incident,
      severity: incident.severity,
      timestamp: new Date().toISOString(),
      recipients: connectedClients.size,
    };

    notifications.unshift(notification);
    if (notifications.length > 200) notifications.pop();

    const sent = broadcast({
      type: "NEW_INCIDENT",
      notification,
    });

    console.log(
      `[Notification] Incident received from MQTT [${topic}] → broadcast to ${sent} WS clients`
    );
  } catch (err) {
    console.error("[Notification] MQTT message parse error:", err.message);
  }
});

mqttClient.on("error", (err) => {
  console.error("[Notification] MQTT error:", err.message);
});

// REST endpoints
app.get("/health", (req, res) => {
  res.json({
    service: "notification-service",
    status: "ok",
    wsClients: connectedClients.size,
    mqttConnected: mqttClient.connected,
    notifications: notifications.length,
    timestamp: new Date().toISOString(),
  });
});

app.get("/notifications", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({
    total: notifications.length,
    wsClients: connectedClients.size,
    notifications: notifications.slice(0, limit),
  });
});

server.listen(PORT, () => {
  console.log(`[Notification Service] HTTP+WS running on port ${PORT}`);
});
