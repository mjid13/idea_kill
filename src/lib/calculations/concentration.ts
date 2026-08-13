import type { ConcentrationMetrics, ConcentrationRiskLevel, PricingAssumptions } from "@/types";
import { val } from "./helpers";

/**
 * Shared thresholds so the dashboard badge and the risk-scoring curve
 * (scoring/risk.ts) never disagree at a boundary.
 */
export const CONCENTRATION_THRESHOLDS = { moderate: 20, high: 40, severe: 60 } as const;

export function concentrationRiskLevel(topCustomersRevenueSharePct: number): ConcentrationRiskLevel {
  if (topCustomersRevenueSharePct >= CONCENTRATION_THRESHOLDS.severe) return "severe";
  if (topCustomersRevenueSharePct >= CONCENTRATION_THRESHOLDS.high) return "high";
  if (topCustomersRevenueSharePct >= CONCENTRATION_THRESHOLDS.moderate) return "moderate";
  return "low";
}

export function calculateConcentrationMetrics(pricing: PricingAssumptions): ConcentrationMetrics {
  const topCustomersRevenueSharePct = val(pricing.topCustomersRevenueSharePct);
  return {
    topCustomersRevenueSharePct,
    riskLevel: concentrationRiskLevel(topCustomersRevenueSharePct),
  };
}
