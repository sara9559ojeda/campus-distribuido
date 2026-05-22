const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3001;

const INCIDENT_SERVICE_URL =
  process.env.INCIDENT_SERVICE_URL || "http://localhost:3002";
const ANALYTICS_SERVICE_URL =
  process.env.ANALYTICS_SERVICE_URL || "http://localhost:3004";

app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

// Rate limiter — relevant for jMeter load tests
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10000,          // increased for load testing
  message: { error: "Too many requests, slow down." },
  skip: (req) => req.path === "/health", // health checks always pass
});
app.use(limiter);

// Middleware: attach request ID
app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader("X-Request-ID", req.requestId);
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    service: "api-gateway",
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// GET /api/incidents — proxy to incident service
app.get("/api/incidents", async (req, res) => {
  try {
    const response = await axios.get(`${INCIDENT_SERVICE_URL}/incidents`, {
      timeout: 5000,
    });
    res.json(response.data);
  } catch (err) {
    console.error("[Gateway] GET /incidents error:", err.message);
    res
      .status(502)
      .json({ error: "Incident service unavailable", requestId: req.requestId });
  }
});

// POST /api/incidents — create new incident
app.post("/api/incidents", async (req, res) => {
  const { description, location, severity, reportedBy } = req.body;

  if (!description || !location || !severity) {
    return res.status(400).json({
      error: "Missing required fields: description, location, severity",
    });
  }

  try {
    const payload = {
      id: uuidv4(),
      description,
      location,
      severity, // LOW | MEDIUM | HIGH | CRITICAL
      reportedBy: reportedBy || "anonymous",
      timestamp: new Date().toISOString(),
      status: "OPEN",
    };

    const response = await axios.post(
      `${INCIDENT_SERVICE_URL}/incidents`,
      payload,
      { timeout: 5000 }
    );

    res.status(201).json(response.data);
  } catch (err) {
    console.error("[Gateway] POST /incidents error:", err.message);
    res
      .status(502)
      .json({ error: "Incident service unavailable", requestId: req.requestId });
  }
});

// GET /api/incidents/:id — get single incident
app.get("/api/incidents/:id", async (req, res) => {
  try {
    const response = await axios.get(
      `${INCIDENT_SERVICE_URL}/incidents/${req.params.id}`,
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: "Incident not found" });
    }
    console.error("[Gateway] GET /incidents/:id error:", err.message);
    res.status(502).json({ error: "Incident service unavailable", requestId: req.requestId });
  }
});

// PATCH /api/incidents/:id/status — update incident status
app.patch("/api/incidents/:id/status", async (req, res) => {
  try {
    const response = await axios.patch(
      `${INCIDENT_SERVICE_URL}/incidents/${req.params.id}/status`,
      req.body,
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: "Incident not found" });
    }
    console.error("[Gateway] PATCH /incidents/:id/status error:", err.message);
    res.status(502).json({ error: "Incident service unavailable", requestId: req.requestId });
  }
});

// GET /api/analytics — proxy to analytics service
app.get("/api/analytics", async (req, res) => {
  try {
    const response = await axios.get(`${ANALYTICS_SERVICE_URL}/analytics`, {
      timeout: 5000,
    });
    res.json(response.data);
  } catch (err) {
    console.error("[Gateway] GET /analytics error:", err.message);
    res
      .status(502)
      .json({ error: "Analytics service unavailable", requestId: req.requestId });
  }
});

// GET /api/analytics/zones
app.get("/api/analytics/zones", async (req, res) => {
  try {
    const response = await axios.get(
      `${ANALYTICS_SERVICE_URL}/analytics/zones`,
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (err) {
    res
      .status(502)
      .json({ error: "Analytics service unavailable", requestId: req.requestId });
  }
});

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ error: "Route not found", path: req.path });
});

app.listen(PORT, () => {
  console.log(`[API Gateway] Running on port ${PORT}`);
});
