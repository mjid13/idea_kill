import {
  DEFAULT_MULTIPLIERS, applyMultipliers, calculateMetrics, forecastProject,
  type SensitivityMultipliers,
} from "@/lib/calculations";
import { calculateScoreBreakdown } from "@/lib/scoring";
import { applyProjectChanges } from "@/lib/projects/mutations";
import type { Project } from "@/types";
import { normalizeMcpPath } from "../paths";
import { monteCarloView } from "./monteCarlo";

export interface ScenarioInput {
  horizon: 12 | 24 | 36;
  overrides?: Array<{ path: string; value: number; quality?: "known" | "estimated" | "unknown" }>;
  multipliers?: Partial<SensitivityMultipliers>;
  includeMonteCarlo?: boolean;
}

/** Bounded so a what-if never costs as much as a full simulation request. */
const SCENARIO_ITERATIONS = 500;

export function scenarioView(baseline: Project, input: ScenarioInput) {
  const multipliers = { ...DEFAULT_MULTIPLIERS, ...(input.multipliers ?? {}) };
  // Multipliers scale the baseline first; absolute overrides then win, so a
  // client can say "20% cheaper, but pin CAC to this number".
  const scaled = input.multipliers ? applyMultipliers(baseline, multipliers) : baseline;
  const scenario = input.overrides?.length
    ? applyProjectChanges(scaled, input.overrides.map((override) => ({ ...override, path: normalizeMcpPath(override.path) }))).project
    : scaled;

  const baselineMetrics = calculateMetrics(baseline);
  const scenarioMetrics = calculateMetrics(scenario);
  const baselineScore = calculateScoreBreakdown(baseline, baselineMetrics);
  const scenarioScore = calculateScoreBreakdown(scenario, scenarioMetrics);
  return {
    appliedMultipliers: multipliers,
    baseline: { metrics: baselineMetrics, score: baselineScore.overall },
    scenario: { metrics: scenarioMetrics, score: scenarioScore.overall },
    scoreDifference: scenarioScore.overall - baselineScore.overall,
    forecast: forecastProject(scenario, scenarioMetrics, input.horizon),
    ...(input.includeMonteCarlo
      ? { monteCarlo: monteCarloView(scenario, { iterations: SCENARIO_ITERATIONS, months: input.horizon }) }
      : {}),
  };
}
