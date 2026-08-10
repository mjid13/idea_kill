import type { CalculatedMetrics, CategoryScore } from "@/types";
import { interpolateScore, weightedAverage } from "./interpolate";

/**
 * Financial Viability — 20% of the overall score.
 * Considers runway, burn efficiency relative to revenue, and how close the
 * business is to break-even.
 */
export function scoreFinancialViability(metrics: CalculatedMetrics): CategoryScore {
  const runwayScore =
    metrics.funding.isProfitable || metrics.funding.runwayMonths === null
      ? 100
      : interpolateScore(metrics.funding.runwayMonths, [
          [0, 5],
          [3, 20],
          [6, 45],
          [12, 68],
          [18, 85],
          [24, 95],
          [36, 100],
        ]);

  // Burn relative to revenue; when there's no revenue yet, treat any burn as
  // the worst-case ratio rather than dividing by zero.
  const burnToRevenueRatio =
    metrics.revenue.monthlyRevenue > 0
      ? metrics.operating.monthlyBurn / metrics.revenue.monthlyRevenue
      : metrics.operating.monthlyBurn > 0
        ? Infinity
        : 0;

  const burnScore = metrics.operating.isCashFlowPositive
    ? 100
    : interpolateScore(burnToRevenueRatio, [
        [0, 90],
        [0.5, 78],
        [1, 60],
        [2, 40],
        [4, 20],
        [8, 5],
      ]);

  const remaining = metrics.breakEven.remainingCustomersToBreakEven;
  const breakEvenScore =
    metrics.breakEven.breakEvenCustomers === null
      ? metrics.breakEven.contributionMarginPerCustomer <= 0
        ? 5 // negative contribution margin: break-even is mathematically unreachable
        : 100 // already profitable per-customer with no fixed-cost gap to close
      : remaining === 0
        ? 100
        : interpolateScore(remaining ?? 0, [
            [0, 100],
            [10, 80],
            [50, 60],
            [150, 40],
            [500, 20],
            [2000, 5],
          ]);

  const score = weightedAverage([
    [runwayScore, 0.35],
    [burnScore, 0.3],
    [breakEvenScore, 0.35],
  ]);

  return {
    category: "financial",
    label: "Financial Viability",
    score: Math.round(score),
    weight: 0.2,
    factors: [
      { label: "Cash runway", score: Math.round(runwayScore), detail: "Months of operating cash remaining at the current burn rate." },
      { label: "Burn efficiency", score: Math.round(burnScore), detail: "Monthly burn relative to monthly revenue." },
      { label: "Break-even proximity", score: Math.round(breakEvenScore), detail: "How many more customers are needed to cover fixed costs." },
    ],
  };
}
