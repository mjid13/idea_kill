import type { BusinessModel, CalculatedMetrics, CategoryScore, RetentionAssumptions } from "@/types";
import { getBenchmarks } from "./benchmarks";
import { interpolateScore, weightedAverage } from "./interpolate";

/**
 * Unit Economics — 20% of the overall score.
 * Considers gross margin, LTV:CAC, CAC payback, and (when entered) Net
 * Revenue Retention, benchmarked against the project's business model (see
 * /lib/scoring/benchmarks.ts).
 */
export function scoreUnitEconomics(
  metrics: CalculatedMetrics,
  businessModel: BusinessModel,
  retention: RetentionAssumptions
): CategoryScore {
  const benchmarks = getBenchmarks(businessModel);

  // Marketplace take rate is already the metric that benchmarks.grossMarginPct is
  // calibrated against for this model ("15-35% take rate is a common healthy band") —
  // feed the real take rate in when it's known instead of the generic, less meaningful
  // COGS-style gross margin.
  const marketplaceTakeRate = metrics.marketplace?.takeRatePct ?? null;
  const grossMarginScore =
    marketplaceTakeRate !== null
      ? interpolateScore(marketplaceTakeRate, benchmarks.grossMarginPct)
      : interpolateScore(metrics.unitEconomics.grossMarginPct, benchmarks.grossMarginPct);

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

  const factors: Array<[number, number]> = [
    [grossMarginScore, 0.25],
    [ltvToCacScore, 0.4],
    [cacPaybackScore, 0.35],
  ];

  // NRR only affects the score once the founder has actually entered expansion or
  // contraction data — otherwise it silently defaults to "no expansion, no
  // contraction" and would move every existing project's score with zero input.
  const hasExpansionData =
    (retention.monthlyExpansionRevenuePct && retention.monthlyExpansionRevenuePct.quality !== "unknown") ||
    (retention.monthlyContractionRevenuePct && retention.monthlyContractionRevenuePct.quality !== "unknown");
  const nrrScore = hasExpansionData
    ? interpolateScore(metrics.retention.netRevenueRetentionPct, benchmarks.netRevenueRetentionPct)
    : null;
  if (nrrScore !== null) factors.push([nrrScore, 0.2]);

  const score = weightedAverage(factors);

  const scoreFactors = [
    { label: "Gross margin", score: Math.round(grossMarginScore), detail: "Gross profit as a share of revenue, benchmarked against your business model." },
    { label: "LTV:CAC ratio", score: Math.round(ltvToCacScore), detail: "Lifetime value relative to acquisition cost." },
    { label: "CAC payback period", score: Math.round(cacPaybackScore), detail: "Months of gross profit needed to recover acquisition cost." },
  ];
  if (nrrScore !== null) {
    scoreFactors.push({
      label: "Net revenue retention",
      score: Math.round(nrrScore),
      detail: "Annualized revenue retained from existing customers after churn, contraction, and expansion.",
    });
  }

  return {
    category: "unitEconomics",
    label: "Unit Economics",
    score: Math.round(score),
    weight: 0.2,
    factors: scoreFactors,
  };
}
