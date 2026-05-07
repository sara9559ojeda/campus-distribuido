const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mqtt = require("mqtt");

const app = express();
const PORT = process.env.PORT || 3004;
const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://localhost:1883";

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Analytics state
const stats = {
  totalIncidents: 0,
  byZone: {},
  bySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
  byHour: {},
  recentResponseTimes: [],
  avgResponseTime: 0,
  lastUpdated: null,
};

function updateStats(incident) {
  stats.totalIncidents++;
  stats.lastUpdated = new Date().toISOString();

  // By zone / location
  const zone = incident.location || "Unknown";
  stats.byZone[zone] = (stats.byZone[zone] || 0) + 1;

  // By severity
  const sev = incident.severity || "LOW";
  if (stats.bySeverity[sev] !== undefined) {
    stats.bySeverity[sev]++;
  }

  // By hour of day
  const hour = new Date(incident.timestamp || Date.now()).getHours();
  const hourKey = `${hour}:00`;
  stats.byHour[hourKey] = (stats.byHour[hourKey] || 0) + 1;

  // Simulated response time (ms) based on severity
  const baseTime = { LOW: 600, MEDIUM: 400, HIGH: 250, CRITICAL: 120 };
  const responseTime =
    (baseTime[sev] || 400) + Math.floor(Math.random() * 200 - 100);
  stats.recentResponseTimes.push(responseTime);
  if (stats.recentResponseTimes.length > 100)
    stats.recentResponseTimes.shift();

  stats.avgResponseTime = Math.round(
    stats.recentResponseTimes.reduce((a, b) => a + b, 0) /
      stats.recentResponseTimes.length
  );
}

// MQTT
const mqttClient = mqtt.connect(MQTT_BROKER, {
  clientId: `analytics-service-${Date.now()}`,
  reconnectPeriod: 3000,
});

mqttClient.on("connect", () => {
  console.log("[Analytics] Connected to MQTT broker");
  mqttClient.subscribe("campus/incidents/#", { qos: 1 }, (err) => {
    if (err) console.error("[Analytics] Subscribe error:", err.message);
    else console.log("[Analytics] Subscribed to campus/incidents/#");
  });
});

mqttClient.on("message", (topic, message) => {
  try {
    const incident = JSON.parse(message.toString());
    updateStats(incident);
    console.log(
      `[Analytics] Stats updated | Total: ${stats.totalIncidents} | Zone: ${incident.location}`
    );
  } catch (err) {
    console.error("[Analytics] Parse error:", err.message);
  }
});

mqttClient.on("error", (err) => {
  console.error("[Analytics] MQTT error:", err.message);
});

// REST
app.get("/health", (req, res) => {
  res.json({
    service: "analytics-service",
    status: "ok",
    totalIncidents: stats.totalIncidents,
    mqttConnected: mqttClient.connected,
    timestamp: new Date().toISOString(),
  });
});

app.get("/analytics", (req, res) => {
  res.json({
    ...stats,
    topZones: Object.entries(stats.byZone)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([zone, count]) => ({ zone, count })),
  });
});

app.get("/analytics/zones", (req, res) => {
  const zones = Object.entries(stats.byZone)
    .sort(([, a], [, b]) => b - a)
    .map(([zone, count]) => ({
      zone,
      count,
      percentage:
        stats.totalIncidents > 0
          ? ((count / stats.totalIncidents) * 100).toFixed(1)
          : 0,
    }));

  res.json({ zones, totalIncidents: stats.totalIncidents });
});

// Seed some initial data for demo
const seedZones = ["Edificio A", "Edificio B", "Cafetería", "Laboratorio", "Biblioteca", "Parking"];
const seedSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
for (let i = 0; i < 12; i++) {
  updateStats({
    location: seedZones[Math.floor(Math.random() * seedZones.length)],
    severity: seedSeverities[Math.floor(Math.random() * seedSeverities.length)],
    timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
  });
}
stats.totalIncidents = 0; // reset counter — seed was for zone distribution only

app.listen(PORT, () => {
  console.log(`[Analytics Service] Running on port ${PORT}`);
});
