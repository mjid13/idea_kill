import type { Insight, Project } from "@/types";
import { calculateMetrics, calculateSensitivityRanking, forecastProject, generateScenarios } from "@/lib/calculations";
import { calculateScoreBreakdown } from "@/lib/scoring";
import { generateDecisionSummary, generateInsights } from "@/lib/insights";
import { englishInsight, interpolate } from "@/lib/mcp/english";
import { assumptionUnit } from "@/lib/mcp/units";

export function analyzeProject(project: Project, forecastMonths: 0 | 12 | 24 | 36 = 24) {
  const metrics = calculateMetrics(project);
  const score = calculateScoreBreakdown(project, metrics);
  const decision = generateDecisionSummary(score);
  const rawInsights = generateInsights(metrics, score, project);
  const insights = Object.fromEntries(Object.entries(rawInsights).map(([key, items]) => [
    key, (items as Insight[]).map(englishInsight),
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

const SECTION_REASONS: Record<string, string> = {
  market: "Improves market sizing and penetration estimates.",
  pricing: "Improves revenue and growth estimates.",
  revenueStreams: "Improves the revenue mix, blended margin, and LTV.",
  marketplace: "Improves GMV and take-rate revenue estimates.",
  acquisition: "Improves CAC and funnel confidence.",
  retention: "Improves lifetime value and revenue durability.",
  unitEconomics: "Improves contribution margin and break-even estimates.",
  costs: "Improves burn, profitability, and runway estimates.",
  funding: "Improves runway and dilution estimates.",
  debt: "Improves debt service coverage, repayment, and lender readiness.",
  validation: "Improves the evidence score behind the decision.",
  team: "Improves the execution score behind the decision.",
  risk: "Improves the risk score behind the decision.",
};

export interface MissingAssumption {
  path: string;
  quality: string;
  why: string;
  suggestedUnit: string;
}

function isAssumption(value: unknown): value is { quality: string } {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && "quality" in (value as object);
}

/**
 * Walks one section. `depth` is bounded by `includeNested`: the flat pass keeps
 * the original one-level behaviour (and its exact output), while the nested
 * pass reaches assumptions that only exist inside arrays — every revenue stream
 * price and every market funnel stage.
 */
function collect(value: unknown, path: string, section: string, includeNested: boolean, output: MissingAssumption[]) {
  if (isAssumption(value)) {
    if (value.quality !== "known") output.push({
      path,
      quality: value.quality,
      why: SECTION_REASONS[section] ?? "Improves the reliability of the analysis.",
      suggestedUnit: assumptionUnit(path.split(".").at(-1) ?? path),
    });
    return;
  }
  if (!includeNested || !value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const id = item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"
        ? (item as { id: string }).id : String(index);
      collect(item, `${path}[${id}]`, section, includeNested, output);
    });
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    collect(child, `${path}.${key}`, section, includeNested, output);
  }
}

export function findMissingAssumptions(project: Project, section?: string, includeNested = false): MissingAssumption[] {
  const output: MissingAssumption[] = [];
  const root = project as unknown as Record<string, unknown>;
  for (const [sectionName, value] of Object.entries(root)) {
    if (section && sectionName !== section) continue;
    if (!value || typeof value !== "object") continue;
    if (Array.isArray(value)) {
      if (includeNested) collect(value, sectionName, sectionName, true, output);
      continue;
    }
    for (const [field, candidate] of Object.entries(value as Record<string, unknown>)) {
      collect(candidate, `${sectionName}.${field}`, sectionName, includeNested, output);
    }
  }
  return output;
}
