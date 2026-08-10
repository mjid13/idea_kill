import type { CategoryScore, ValidationAssessment } from "@/types";
import { ratingToScore, weightedAverage } from "./interpolate";

/**
 * Validation — 15% of the overall score.
 * Weighs concrete evidence (paying customers, LOIs, users) more heavily than
 * problem-severity self-assessment, since demonstrated demand is stronger
 * signal than an opinion about the problem.
 */
export function scoreValidation(validation: ValidationAssessment): CategoryScore {
  const problemScore = weightedAverage([
    [ratingToScore(validation.problemPain), 1],
    [ratingToScore(validation.problemFrequency), 1],
    [ratingToScore(validation.problemAlreadySpendingMoney), 1],
  ]);

  const evidenceScore = weightedAverage([
    [ratingToScore(validation.customersInterviewed), 1],
    [ratingToScore(validation.hasUsers), 1],
    [ratingToScore(validation.hasPayingCustomers), 1.5],
    [ratingToScore(validation.hasSignedLois), 1],
    [ratingToScore(validation.customersRequestedSolution), 1],
  ]);

  const score = weightedAverage([
    [problemScore, 0.3],
    [evidenceScore, 0.7],
  ]);

  return {
    category: "validation",
    label: "Validation",
    score: Math.round(score),
    weight: 0.15,
    factors: [
      { label: "Problem severity", score: Math.round(problemScore), detail: "How painful, frequent, and already-paid-for the problem is." },
      { label: "Demonstrated demand", score: Math.round(evidenceScore), detail: "Interviews, users, paying customers, LOIs, and inbound requests." },
    ],
  };
}
