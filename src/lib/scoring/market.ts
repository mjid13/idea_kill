import type { CalculatedMetrics, CategoryScore, ValidationAssessment } from "@/types";
import { interpolateScore, ratingToScore, weightedAverage } from "./interpolate";

/**
 * Market Opportunity — 20% of the overall score.
 * Considers SAM/SOM scale, how much of the addressable market must be
 * captured to hit the plan (lower required penetration = more credible),
 * and competitive intensity/differentiation.
 */
export function scoreMarketOpportunity(
  metrics: CalculatedMetrics,
  validation: ValidationAssessment
): CategoryScore {
  // Log-scale bands: market size scoring is currency-relative, not absolute,
  // so these anchors describe typical "meaningful opportunity" magnitudes in
  // whatever currency unit the user entered.
  const samScore = interpolateScore(metrics.market.sam, [
    [0, 5],
    [100_000, 25],
    [1_000_000, 50],
    [10_000_000, 75],
    [100_000_000, 95],
    [1_000_000_000, 100],
  ]);

  const somScore = interpolateScore(metrics.market.som, [
    [0, 5],
    [10_000, 20],
    [100_000, 45],
    [1_000_000, 70],
    [10_000_000, 90],
    [100_000_000, 100],
  ]);

  const penetrationScore = interpolateScore(metrics.market.requiredMarketPenetrationPct, [
    [0, 100],
    [1, 92],
    [5, 78],
    [15, 55],
    [30, 30],
    [50, 10],
    [100, 0],
  ]);

  const competitionScore = interpolateScore(validation.competitionIntensity, [
    [1, 100],
    [3, 55],
    [5, 15],
  ]);
  const differentiationScore = ratingToScore(validation.differentiationStrength);
  const switchingScore = ratingToScore(validation.switchingEase);
  const competitiveLandscapeScore = weightedAverage([
    [competitionScore, 0.5],
    [differentiationScore, 0.3],
    [switchingScore, 0.2],
  ]);

  const score = weightedAverage([
    [samScore, 0.25],
    [somScore, 0.25],
    [penetrationScore, 0.3],
    [competitiveLandscapeScore, 0.2],
  ]);

  return {
    category: "market",
    label: "Market Opportunity",
    score: Math.round(score),
    weight: 0.2,
    factors: [
      { label: "Serviceable available market (SAM)", score: Math.round(samScore), detail: "Size of the realistically addressable market." },
      { label: "Serviceable obtainable market (SOM)", score: Math.round(somScore), detail: "Realistic revenue opportunity given your obtainable share." },
      { label: "Required market penetration", score: Math.round(penetrationScore), detail: "Share of the addressable market your target customers represent — lower is more credible." },
      { label: "Competitive landscape", score: Math.round(competitiveLandscapeScore), detail: "Competition intensity, differentiation strength, and switching ease combined." },
    ],
  };
}
