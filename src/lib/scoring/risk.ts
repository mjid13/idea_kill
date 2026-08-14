import type { CategoryScore, PricingAssumptions, RiskAssessment } from "@/types";
import { concentrationRiskLevel } from "@/lib/calculations/concentration";
import { val } from "@/lib/calculations/helpers";
import { invertedRatingToScore, weightedAverage } from "./interpolate";

const CONCENTRATION_RISK_SCORE: Record<ReturnType<typeof concentrationRiskLevel>, number> = {
  low: 100,
  moderate: 65,
  high: 30,
  severe: 0,
};

/**
 * Risk — 10% of the overall score. High risk ratings (1-5, 5 = highest risk)
 * pull the score down; the category score reported is a "safety" score
 * (100 = low risk) so it composes the same way as the other categories.
 */
export function scoreRisk(risk: RiskAssessment, pricing: PricingAssumptions): CategoryScore {
  const technicalScore = invertedRatingToScore(risk.technicalRisk);
  const marketScore = invertedRatingToScore(risk.marketRisk);
  const regulatoryScore = invertedRatingToScore(risk.regulatoryRisk);
  const competitiveScore = invertedRatingToScore(risk.competitiveRisk);
  const financialScore = invertedRatingToScore(risk.financialRisk);
  const dependencyScore = invertedRatingToScore(risk.dependencyRisk);

  const pairs: Array<[number, number]> = [
    [technicalScore, 1],
    [marketScore, 1],
    [regulatoryScore, 1],
    [competitiveScore, 1],
    [financialScore, 1],
    [dependencyScore, 1],
  ];

  // Only affects the score once the founder has actually entered a concentration
  // estimate — otherwise it defaults to "0% concentration" and would silently
  // improve every existing project's risk score with zero input.
  const hasConcentrationData = pricing.topCustomersRevenueSharePct && pricing.topCustomersRevenueSharePct.quality !== "unknown";
  const concentrationScore = hasConcentrationData
    ? CONCENTRATION_RISK_SCORE[concentrationRiskLevel(val(pricing.topCustomersRevenueSharePct))]
    : null;
  // Lower weight than the six paired 1-5 ratings — it's a single, coarser
  // self-reported estimate rather than a structured assessment.
  if (concentrationScore !== null) pairs.push([concentrationScore, 0.75]);

  const score = weightedAverage(pairs);

  const factors = [
    { label: "Technical risk", score: Math.round(technicalScore), detail: "Risk the product cannot be built as envisioned." },
    { label: "Market risk", score: Math.round(marketScore), detail: "Risk the market does not materialize as expected." },
    { label: "Regulatory risk", score: Math.round(regulatoryScore), detail: "Exposure to regulation or compliance requirements." },
    { label: "Competitive risk", score: Math.round(competitiveScore), detail: "Risk of being displaced by competitors." },
    { label: "Financial risk", score: Math.round(financialScore), detail: "Risk of running out of capital or funding." },
    { label: "Dependency risk", score: Math.round(dependencyScore), detail: "Reliance on third parties, platforms, or key individuals." },
  ];
  if (concentrationScore !== null) {
    factors.push({
      label: "Customer concentration",
      score: Math.round(concentrationScore),
      detail: "Exposure to revenue loss if your largest customers churn.",
    });
  }

  return {
    category: "risk",
    label: "Risk",
    score: Math.round(score),
    weight: 0.1,
    factors,
  };
}
