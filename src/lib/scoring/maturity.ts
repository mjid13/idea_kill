import type { MaturityStage, MaturityStageId, Project } from "@/types";
import { val } from "@/lib/calculations/helpers";
import type { CalculatedMetrics } from "@/types";

const STAGE_INFO: Record<MaturityStageId, { label: string; description: string }> = {
  0: { label: "Idea", description: "No customer evidence yet." },
  1: { label: "Problem Validated", description: "Customer interviews indicate a real problem." },
  2: { label: "Solution Validated", description: "Users show interest in the proposed solution." },
  3: { label: "Revenue Validated", description: "Customers are paying." },
  4: { label: "Growth Validated", description: "Retention and repeatable acquisition exist." },
  5: { label: "Scale Ready", description: "Economics and acquisition channels show evidence of scalability." },
};

/**
 * Validation maturity is reported as its own stage (spec section 33) and is
 * deliberately kept separate from the financial viability score — a Stage 0
 * idea can still have excellent projected unit economics, and a Stage 4
 * business can have weak ones.
 */
export function determineMaturityStage(project: Project, metrics: CalculatedMetrics): MaturityStage {
  const v = project.validation;
  const hasRealPayingCustomers = val(project.pricing.currentCustomers) > 0 && project.pricing.currentCustomers.quality !== "unknown";
  const hasRepeatableAcquisition =
    project.acquisition.newCustomersAcquiredMonthly.quality !== "unknown" &&
    val(project.acquisition.newCustomersAcquiredMonthly) > 0;
  const churnKnown = project.retention.monthlyChurnPct.quality !== "unknown";
  const scalableEconomics = (metrics.unitEconomics.ltvToCacRatio ?? 0) >= 3;

  let stage: MaturityStageId = 0;

  if (v.customersInterviewed >= 3) stage = 1;
  if (stage >= 1 && (v.hasUsers >= 3 || v.customersRequestedSolution >= 3)) stage = 2;
  if (stage >= 2 && (v.hasPayingCustomers >= 3 || hasRealPayingCustomers)) stage = 3;
  if (stage >= 3 && hasRepeatableAcquisition && churnKnown) stage = 4;
  if (stage >= 4 && scalableEconomics && hasRepeatableAcquisition) stage = 5;

  return { stage, ...STAGE_INFO[stage] };
}
