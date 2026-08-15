import type { Insight, Project } from "@/types";
import { calculateMetrics, calculateSensitivityRanking, forecastProject, generateScenarios } from "@/lib/calculations";
import { calculateScoreBreakdown } from "@/lib/scoring";
import { generateDecisionSummary, generateInsights } from "@/lib/insights";

function interpolate(template: string, params?: Record<string, string | number>) {
  return Object.entries(params ?? {}).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);
}

function englishInsight(item: Insight) {
  const detail = item.detail ? interpolate(item.detail, item.detailParams) : undefined;
  return detail === undefined
    ? { message: interpolate(item.message, item.messageParams) }
    : { message: interpolate(item.message, item.messageParams), detail };
}

export function analyzeProject(project: Project, forecastMonths: 0 | 12 | 24 | 36 = 24) {
  const metrics = calculateMetrics(project);
  const score = calculateScoreBreakdown(project, metrics);
  const decision = generateDecisionSummary(score);
  const rawInsights = generateInsights(metrics, score, project);
  const insights = Object.fromEntries(Object.entries(rawInsights).map(([key, items]) => [
    key, items.map(englishInsight),
  ]));
  const scenarioResult = generateScenarios(project, metrics);
  return {
    metrics,
    score,
    decision: {
      ...decision,
      reasons: decision.reasons.map((reason) => interpolate(reason.template, reason.params)),
    },
    insights,
    scenarios: scenarioResult.scenarios,
    forecast: forecastMonths ? forecastProject(project, metrics, forecastMonths) : [],
    sensitivity: calculateSensitivityRanking(project),
  };
}

export function findMissingAssumptions(project: Project, section?: string) {
  const descriptions: Record<string, string> = {
    market: "Improves market sizing and penetration estimates.",
    pricing: "Improves revenue and growth estimates.",
    acquisition: "Improves CAC and funnel confidence.",
    retention: "Improves lifetime value and revenue durability.",
    unitEconomics: "Improves contribution margin and break-even estimates.",
    costs: "Improves burn, profitability, and runway estimates.",
    funding: "Improves runway and dilution estimates.",
  };
  const output: Array<{ path: string; quality: string; why: string; suggestedUnit: string }> = [];
  const root = project as unknown as Record<string, unknown>;
  for (const [sectionName, value] of Object.entries(root)) {
    if (section && sectionName !== section) continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    for (const [field, candidate] of Object.entries(value as Record<string, unknown>)) {
      if (candidate && typeof candidate === "object" && "quality" in candidate) {
        const assumption = candidate as { quality: string };
        if (assumption.quality !== "known") output.push({
          path: `${sectionName}.${field}`,
          quality: assumption.quality,
          why: descriptions[sectionName] ?? "Improves the reliability of the analysis.",
          suggestedUnit: /Pct|Rate|Margin|Churn|Conversion|Share/.test(field) ? "percent" : "number or currency",
        });
      }
    }
  }
  return output;
}
