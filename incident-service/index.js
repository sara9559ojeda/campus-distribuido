const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mqtt = require("mqtt");

const app = express();
const PORT = process.env.PORT || 3002;
const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://localhost:1883";

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// In-memory store (for demo / load test purposes)
const incidents = [];

// Connect to MQTT broker
let mqttClient;
function connectMQTT() {
  mqttClient = mqtt.connect(MQTT_BROKER, {
    clientId: `incident-service-${Date.now()}`,
    reconnectPeriod: 3000,
    connectTimeout: 5000,
  });

  mqttClient.on("connect", () => {
    console.log("[Incident Service] Connected to MQTT broker");
  });

  mqttClient.on("error", (err) => {
    console.error("[Incident Service] MQTT error:", err.message);
  });

  mqttClient.on("reconnect", () => {
    console.log("[Incident Service] Reconnecting to MQTT...");
  });
}

connectMQTT();

// Health check
app.get("/health", (req, res) => {
  res.json({
    service: "incident-service",
    status: "ok",
    incidents: incidents.length,
    mqttConnected: mqttClient?.connected || false,
    timestamp: new Date().toISOString(),
  });
});

// GET /incidents
app.get("/incidents", (req, res) => {
  const { severity, status, limit = 50 } = req.query;
  let result = [...incidents].reverse(); // newest first

  if (severity) result = result.filter((i) => i.severity === severity.toUpperCase());
  if (status) result = result.filter((i) => i.status === status.toUpperCase());

  res.json({
    total: incidents.length,
    returned: Math.min(result.length, parseInt(limit)),
    incidents: result.slice(0, parseInt(limit)),
  });
});

// GET /incidents/:id
app.get("/incidents/:id", (req, res) => {
  const incident = incidents.find((i) => i.id === req.params.id);
  if (!incident) return res.status(404).json({ error: "Incident not found" });
  res.json(incident);
});

// POST /incidents — register incident + publish to MQTT
app.post("/incidents", (req, res) => {
  const incident = {
    ...req.body,
    status: req.body.status || "OPEN",
    timestamp: req.body.timestamp || new Date().toISOString(),
  };

  incidents.push(incident);

  // Publish to MQTT topics
  const topic = `campus/incidents/${incident.severity.toLowerCase()}`;
  const payload = JSON.stringify(incident);

  if (mqttClient?.connected) {
    mqttClient.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) console.error("[Incident Service] MQTT publish error:", err.message);
      else console.log(`[Incident Service] Published to ${topic}`);
    });

    // Also publish to general topic for all subscribers
    mqttClient.publish("campus/incidents/all", payload, { qos: 1 });
  } else {
    console.warn("[Incident Service] MQTT not connected, skipping publish");
  }

  res.status(201).json({
    success: true,
    incident,
    mqttPublished: mqttClient?.connected || false,
  });
});

// PATCH /incidents/:id/status
app.patch("/incidents/:id/status", (req, res) => {
  const incident = incidents.find((i) => i.id === req.params.id);
  if (!incident) return res.status(404).json({ error: "Incident not found" });

  incident.status = req.body.status || incident.status;
  incident.updatedAt = new Date().toISOString();

  if (mqttClient?.connected) {
    mqttClient.publish(
      "campus/incidents/updated",
      JSON.stringify(incident),
      { qos: 1 }
    );
  }

  res.json({ success: true, incident });
});

app.listen(PORT, () => {
  console.log(`[Incident Service] Running on port ${PORT}`);
});
