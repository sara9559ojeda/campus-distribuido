import { useState, useEffect, useCallback } from "react";
import { fetchAnalytics } from "../lib/api";
import {
  analyzeZoneRisks,
  analyzeTrend,
  generatePredictiveAlerts,
  buildTimelineData,
  buildSeverityDistribution,
  calculateRiskScore,
  getRiskLevel,
} from "../analytics/predictiveEngine";

/**
 * Polls the analytics service and derives predictive intelligence
 * from the real-time WS notification buffer.
 */
export function useAnalytics(notifications = []) {
  const [analytics, setAnalytics] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchAnalytics();
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [load]);

  // ── Derived predictive state ──────────────────────────────────────
  const zoneRisks        = analyzeZoneRisks(analytics?.byZone, notifications);
  const trend            = analyzeTrend(notifications);
  const predictiveAlerts = generatePredictiveAlerts(zoneRisks, trend);
  const timelineData     = buildTimelineData(notifications);
  const severityDist     = buildSeverityDistribution(analytics?.bySeverity);
  const overallScore     = calculateRiskScore(analytics?.bySeverity);
  const overallRisk      = getRiskLevel(overallScore);

  return {
    // Raw analytics
    analytics,
    loading,
    error,
    refresh: load,
    // Predictive
    zoneRisks,
    trend,
    predictiveAlerts,
    timelineData,
    severityDist,
    overallScore,
    overallRisk,
  };
}
