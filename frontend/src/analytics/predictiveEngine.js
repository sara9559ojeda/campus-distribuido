// Predictive analytics engine — rule-based risk scoring, no ML
// Formula: riskScore = (critical×5) + (high×3) + (medium×2) + (low×1)
// Normalised to 0–100 relative to max-possible score (total × 5)

export const RISK_LEVELS = {
  LOW:      { label: "LOW",      color: "#00d084", bg: "rgba(0,208,132,0.12)",  border: "rgba(0,208,132,0.35)",  threshold: 25 },
  MEDIUM:   { label: "MEDIUM",   color: "#ffd60a", bg: "rgba(255,214,10,0.12)", border: "rgba(255,214,10,0.35)", threshold: 50 },
  HIGH:     { label: "HIGH",     color: "#ff9500", bg: "rgba(255,149,0,0.12)",  border: "rgba(255,149,0,0.35)",  threshold: 75 },
  CRITICAL: { label: "CRITICAL", color: "#ff3b3b", bg: "rgba(255,59,59,0.12)",  border: "rgba(255,59,59,0.35)",  threshold: 100 },
};

/** Returns 0–100 */
export function calculateRiskScore(bySeverity = {}) {
  const c = bySeverity.CRITICAL || 0;
  const h = bySeverity.HIGH     || 0;
  const m = bySeverity.MEDIUM   || 0;
  const l = bySeverity.LOW      || 0;
  const total = c + h + m + l;
  if (total === 0) return 0;
  const raw         = c * 5 + h * 3 + m * 2 + l * 1;
  const maxPossible = total * 5;
  return Math.round((raw / maxPossible) * 100);
}

export function getRiskLevel(score) {
  if (score <= 25) return RISK_LEVELS.LOW;
  if (score <= 50) return RISK_LEVELS.MEDIUM;
  if (score <= 75) return RISK_LEVELS.HIGH;
  return RISK_LEVELS.CRITICAL;
}

/**
 * Per-zone risk analysis.
 * Uses the last 20 WS notifications to build recent severity breakdown.
 */
export function analyzeZoneRisks(byZone = {}, notifications = []) {
  // Build recent severity map from WS feed
  const recentByZone = {};
  notifications.slice(0, 30).forEach((n) => {
    const loc = n.incident?.location;
    const sev = n.incident?.severity;
    if (!loc || !sev) return;
    if (!recentByZone[loc]) {
      recentByZone[loc] = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, total: 0 };
    }
    recentByZone[loc][sev]++;
    recentByZone[loc].total++;
  });

  return Object.entries(byZone)
    .map(([zone, count]) => {
      const recent = recentByZone[zone] || {};
      const score  = calculateRiskScore(recent);
      const level  = getRiskLevel(score);
      return {
        zone,
        totalCount:  count,
        recentCount: recent.total || 0,
        recentSev:   recent,
        score,
        level,
        trend: recent.total > 0 ? "rising" : "stable",
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Trend analysis over WS notification window.
 * Compares first half vs second half of the notification buffer.
 */
export function analyzeTrend(notifications = []) {
  if (notifications.length < 4) {
    return { status: "insufficient_data", direction: "neutral", ratePct: 0, recentHigh: 0, olderHigh: 0 };
  }
  const half       = Math.ceil(notifications.length / 2);
  const recent     = notifications.slice(0, half);
  const older      = notifications.slice(half);
  const isHigh     = (n) => ["CRITICAL", "HIGH"].includes(n.incident?.severity);
  const recentHigh = recent.filter(isHigh).length;
  const olderHigh  = older.filter(isHigh).length;

  if (olderHigh === 0) {
    return {
      status:     recentHigh > 0 ? "escalating" : "stable",
      direction:  recentHigh > 0 ? "up" : "neutral",
      ratePct:    0,
      recentHigh,
      olderHigh,
    };
  }
  const ratePct = ((recentHigh - olderHigh) / olderHigh) * 100;
  return {
    status:    ratePct > 20 ? "escalating" : ratePct < -20 ? "improving" : "stable",
    direction: ratePct > 0  ? "up"         : ratePct < 0   ? "down"      : "neutral",
    ratePct:   Math.abs(Math.round(ratePct)),
    recentHigh,
    olderHigh,
  };
}

/**
 * Generate human-readable predictive alerts.
 */
export function generatePredictiveAlerts(zoneRisks, trend) {
  const alerts = [];

  if (trend.direction === "up" && trend.ratePct > 20) {
    alerts.push({
      id:      "trend-campus",
      type:    "CRITICAL",
      message: "Incident escalation trend detected across campus",
      detail:  `High-severity incidents increased ${trend.ratePct}% in recent window`,
      zone:    "Campus-wide",
    });
  }

  zoneRisks.forEach((z) => {
    if (z.level.label === "CRITICAL") {
      alerts.push({
        id:      `zone-crit-${z.zone}`,
        type:    "CRITICAL",
        message: `High probability of incident escalation — ${z.zone}`,
        detail:  `Risk score ${z.score}/100 · ${z.recentCount} recent incident${z.recentCount !== 1 ? "s" : ""}`,
        zone:    z.zone,
      });
    } else if (z.level.label === "HIGH") {
      alerts.push({
        id:      `zone-high-${z.zone}`,
        type:    "HIGH",
        message: `Elevated risk detected — ${z.zone}`,
        detail:  `Risk score ${z.score}/100 · Monitor closely`,
        zone:    z.zone,
      });
    }
  });

  return alerts;
}

/**
 * Build hourly timeline data from WS notifications for the last N hours.
 */
export function buildTimelineData(notifications = [], hours = 12) {
  const now = Date.now();
  const slots = Array.from({ length: hours }, (_, i) => {
    const slotMs = now - (hours - 1 - i) * 3_600_000;
    return {
      hour:     new Date(slotMs).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
      slotMs,
      CRITICAL: 0,
      HIGH:     0,
      MEDIUM:   0,
      LOW:      0,
      total:    0,
    };
  });

  notifications.forEach((n) => {
    const ts  = new Date(n.timestamp || n.incident?.timestamp).getTime();
    const sev = n.incident?.severity;
    if (!sev || isNaN(ts)) return;
    // Find which hourly slot this falls into
    const idx = slots.findIndex(
      (s, i) => ts >= s.slotMs && (i === slots.length - 1 || ts < slots[i + 1].slotMs)
    );
    if (idx >= 0) {
      slots[idx][sev]++;
      slots[idx].total++;
    }
  });

  return slots;
}

/**
 * Severity distribution for pie/bar charts.
 */
export function buildSeverityDistribution(bySeverity = {}) {
  const COLORS = {
    CRITICAL: "#ff3b3b",
    HIGH:     "#ff9500",
    MEDIUM:   "#ffd60a",
    LOW:      "#00d084",
  };
  return Object.entries(COLORS).map(([name, color]) => ({
    name,
    value: bySeverity[name] || 0,
    color,
  }));
}
