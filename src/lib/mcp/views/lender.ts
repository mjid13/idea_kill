import { calculateLenderMetrics, calculateMetrics } from "@/lib/calculations";
import { assessLenderReadiness } from "@/lib/lender/assessment";
import type { Project } from "@/types";
import { englishAudienceCheck } from "../english";

export interface LenderViewOptions { includeSchedule: boolean; scheduleMonths: number }

/**
 * Lender Mode has no route in the app, so this is the only way to reach it.
 * The month-by-month arrays are omitted by default: a 360-month term produces
 * three arrays of 360 rows, which swamps a tool result for a client that only
 * asked whether the loan is bankable.
 */
export function lenderView(project: Project, options: LenderViewOptions) {
  const metrics = calculateMetrics(project);
  const lender = calculateLenderMetrics(project, metrics);
  const assessment = assessLenderReadiness(lender, metrics, project);
  const { schedule, service, annual, ...headline } = lender;
  return {
    verdict: assessment.verdict,
    title: assessment.title,
    description: assessment.description,
    checks: assessment.checks.map(englishAudienceCheck),
    metrics: headline,
    // An ask the app derived from the funding requirement reads exactly like one
    // the founder entered unless it is labelled.
    loanAmountIsDerived: project.debt?.loanAmount === undefined || project.debt.loanAmount.quality === "unknown",
    notice: "debt.* has no wizard form in the app — MCP is the only way to populate loan terms.",
    ...(options.includeSchedule
      ? {
          schedule: schedule.slice(0, options.scheduleMonths),
          service: service.slice(0, options.scheduleMonths),
          annual,
        }
      : {}),
  };
}
