import type { CalculatedMetrics, Project, ScoreBreakdown, ScoreCategory, ViabilityClassification } from "@/types";
import { scoreMarketOpportunity } from "./market";
import { scoreUnitEconomics } from "./unitEconomics";
import { scoreFinancialViability } from "./financial";
import { scoreValidation } from "./validation";
import { scoreExecution } from "./execution";
import { scoreRisk } from "./risk";
import { calculateConfidence } from "./confidence";
import { determineMaturityStage } from "./maturity";

export * from "./benchmarks";
export * from "./interpolate";
export { scoreMarketOpportunity, scoreUnitEconomics, scoreFinancialViability, scoreValidation, scoreExecution, scoreRisk, calculateConfidence, determineMaturityStage };

/**
 * Overall Score = Market x 0.20 + Unit Economics x 0.20 + Financial x 0.20 +
 * Validation x 0.15 + Execution x 0.15 + Risk x 0.10 (spec section 16).
 */
export function calculateScoreBreakdown(project: Project, metrics: CalculatedMetrics): ScoreBreakdown {
  const market = scoreMarketOpportunity(metrics, project.validation, project.basicInfo.currency);
  const unitEconomics = scoreUnitEconomics(metrics, project.basicInfo.businessModel, project.retention);
  const financial = scoreFinancialViability(metrics);
  const validation = scoreValidation(project.validation);
  const execution = scoreExecution(project.team, project.validation);
  const risk = scoreRisk(project.risk, project.pricing);

  const categories: Record<ScoreCategory, ReturnType<typeof scoreMarketOpportunity>> = {
    market,
    unitEconomics,
    financial,
    validation,
    execution,
    risk,
  };

  const overall = Object.values(categories).reduce((sum, c) => sum + c.score * c.weight, 0);

  return {
    overall: Math.round(Math.min(100, Math.max(0, overall))),
    categories,
    confidence: calculateConfidence(project, metrics),
    maturityStage: determineMaturityStage(project, metrics),
  };
}

export function classifyScore(overall: number): ViabilityClassification {
  if (overall < 40) return "High Risk";
  if (overall < 55) return "Weak";
  if (overall < 70) return "Promising";
  if (overall < 85) return "Strong";
  return "Very Strong";
}

export const CLASSIFICATION_DESCRIPTIONS: Record<ViabilityClassification, string> = {
  "High Risk": "Several critical assumptions currently make the economics unattractive.",
  Weak: "The economics show significant gaps based on current assumptions.",
  Promising: "The opportunity has potential but key assumptions need strengthening.",
  Strong: "Strong economics based on current assumptions.",
  "Very Strong": "Very strong economics based on current assumptions.",
};
