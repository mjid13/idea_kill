import type { CategoryScore, RiskAssessment } from "@/types";
import { invertedRatingToScore, weightedAverage } from "./interpolate";

/**
 * Risk — 10% of the overall score. High risk ratings (1-5, 5 = highest risk)
 * pull the score down; the category score reported is a "safety" score
 * (100 = low risk) so it composes the same way as the other categories.
 */
export function scoreRisk(risk: RiskAssessment): CategoryScore {
  const technicalScore = invertedRatingToScore(risk.technicalRisk);
  const marketScore = invertedRatingToScore(risk.marketRisk);
  const regulatoryScore = invertedRatingToScore(risk.regulatoryRisk);
  const competitiveScore = invertedRatingToScore(risk.competitiveRisk);
  const financialScore = invertedRatingToScore(risk.financialRisk);
  const dependencyScore = invertedRatingToScore(risk.dependencyRisk);

  const score = weightedAverage([
    [technicalScore, 1],
    [marketScore, 1],
    [regulatoryScore, 1],
    [competitiveScore, 1],
    [financialScore, 1],
    [dependencyScore, 1],
  ]);

  return {
    category: "risk",
    label: "Risk",
    score: Math.round(score),
    weight: 0.1,
    factors: [
      { label: "Technical risk", score: Math.round(technicalScore), detail: "Risk the product cannot be built as envisioned." },
      { label: "Market risk", score: Math.round(marketScore), detail: "Risk the market does not materialize as expected." },
      { label: "Regulatory risk", score: Math.round(regulatoryScore), detail: "Exposure to regulation or compliance requirements." },
      { label: "Competitive risk", score: Math.round(competitiveScore), detail: "Risk of being displaced by competitors." },
      { label: "Financial risk", score: Math.round(financialScore), detail: "Risk of running out of capital or funding." },
      { label: "Dependency risk", score: Math.round(dependencyScore), detail: "Reliance on third parties, platforms, or key individuals." },
    ],
  };
}
