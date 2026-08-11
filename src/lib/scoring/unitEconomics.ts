import type { BusinessModel, CalculatedMetrics, CategoryScore } from "@/types";
import { getBenchmarks } from "./benchmarks";
import { interpolateScore, weightedAverage } from "./interpolate";

/**
 * Unit Economics — 20% of the overall score.
 * Considers gross margin, LTV:CAC, and CAC payback, benchmarked against the
 * project's business model (see /lib/scoring/benchmarks.ts).
 */
export function scoreUnitEconomics(metrics: CalculatedMetrics, businessModel: BusinessModel): CategoryScore {
  const benchmarks = getBenchmarks(businessModel);

  const grossMarginScore = interpolateScore(metrics.unitEconomics.grossMarginPct, benchmarks.grossMarginPct);

  const ltvToCac = metrics.unitEconomics.ltvToCacRatio;
  const ltvToCacScore = ltvToCac === null ? 0 : interpolateScore(ltvToCac, benchmarks.ltvToCac);

  const cacPayback = metrics.unitEconomics.cacPaybackMonths;
  // A null payback usually means CAC/spend hasn't been entered yet, which is
  // treated as neutral rather than penalized. But it's also null when gross
  // profit per customer is negative (payback is mathematically impossible) —
  // that case must be penalized, not treated as "no data".
  const cacPaybackScore =
    cacPayback === null
      ? metrics.unitEconomics.grossProfitPerCustomer < 0
        ? 0
        : 40
      : interpolateScore(cacPayback, benchmarks.cacPaybackMonths);

  const score = weightedAverage([
    [grossMarginScore, 0.25],
    [ltvToCacScore, 0.4],
    [cacPaybackScore, 0.35],
  ]);

  return {
    category: "unitEconomics",
    label: "Unit Economics",
    score: Math.round(score),
    weight: 0.2,
    factors: [
      { label: "Gross margin", score: Math.round(grossMarginScore), detail: "Gross profit as a share of revenue, benchmarked against your business model." },
      { label: "LTV:CAC ratio", score: Math.round(ltvToCacScore), detail: "Lifetime value relative to acquisition cost." },
      { label: "CAC payback period", score: Math.round(cacPaybackScore), detail: "Months of gross profit needed to recover acquisition cost." },
    ],
  };
}
