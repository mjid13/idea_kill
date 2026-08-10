import type { CategoryScore, TeamAssessment, ValidationAssessment } from "@/types";
import { ratingToScore, weightedAverage } from "./interpolate";

/**
 * Execution — 15% of the overall score.
 * Considers team capability/commitment and distribution advantage — the
 * team's ability to actually build and sell, not the market itself.
 */
export function scoreExecution(team: TeamAssessment, validation: ValidationAssessment): CategoryScore {
  const teamScore = weightedAverage([
    [ratingToScore(team.domainExpertise), 1],
    [ratingToScore(team.technicalAbility), 1],
    [ratingToScore(team.salesCapability), 1],
    [ratingToScore(team.marketingCapability), 1],
    [ratingToScore(team.founderCommitment), 1.5],
    [ratingToScore(team.industryRelationships), 0.75],
    [ratingToScore(team.accessToCapital), 0.75],
  ]);

  const distributionScore = weightedAverage([
    [ratingToScore(validation.knowsHowToReachCustomers), 1],
    [ratingToScore(validation.hasAudience), 1],
    [ratingToScore(validation.hasPartnerships), 1],
    [ratingToScore(validation.hasUnfairDistributionAdvantage), 1],
  ]);

  const score = weightedAverage([
    [teamScore, 0.6],
    [distributionScore, 0.4],
  ]);

  return {
    category: "execution",
    label: "Execution",
    score: Math.round(score),
    weight: 0.15,
    factors: [
      { label: "Team capability", score: Math.round(teamScore), detail: "Domain expertise, technical/sales/marketing ability, and founder commitment." },
      { label: "Distribution advantage", score: Math.round(distributionScore), detail: "Ability to reach customers: audience, partnerships, and channel advantages." },
    ],
  };
}
