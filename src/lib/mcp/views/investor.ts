import { calculateMetrics } from "@/lib/calculations";
import { calculateScoreBreakdown } from "@/lib/scoring";
import { assessInvestorReadiness, buildInvestorSummary } from "@/lib/investor/summary";
import type { Project } from "@/types";
import { englishAudienceCheck } from "../english";

/** Investor Mode has no route in the app either — same reasoning as lenderView. */
export function investorView(project: Project) {
  const metrics = calculateMetrics(project);
  const summary = buildInvestorSummary(project, metrics);
  const assessment = assessInvestorReadiness(summary, calculateScoreBreakdown(project, metrics));
  const { checks, ...headline } = summary;
  return {
    verdict: assessment.verdict,
    title: assessment.title,
    description: assessment.description,
    checks: checks.map(englishAudienceCheck),
    summary: headline,
  };
}
