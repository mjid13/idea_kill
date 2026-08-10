import { describe, expect, it } from "vitest";
import { generateInsights } from "../engine";
import { generateDecisionSummary } from "../decision";
import { calculateMetrics } from "@/lib/calculations/metrics";
import { calculateScoreBreakdown } from "@/lib/scoring";
import { exampleProject } from "@/lib/example";
import { known, type Project } from "@/types";

describe("generateInsights", () => {
  it("flags value-destroying acquisition when LTV:CAC < 1", () => {
    const project: Project = {
      ...exampleProject,
      acquisition: { ...exampleProject.acquisition, monthlyMarketingSpend: known(50000) },
    };
    const metrics = calculateMetrics(project);
    const scores = calculateScoreBreakdown(project, metrics);
    const report = generateInsights(metrics, scores, project);
    expect(report.criticalRisks.some((i) => i.message.includes("destroys value"))).toBe(true);
  });

  it("flags healthy economics when LTV:CAC >= 3", () => {
    const metrics = calculateMetrics(exampleProject);
    const scores = calculateScoreBreakdown(exampleProject, metrics);
    const report = generateInsights(metrics, scores, exampleProject);
    if ((metrics.unitEconomics.ltvToCacRatio ?? 0) >= 3) {
      expect(report.strengths.some((i) => i.message.includes("healthy"))).toBe(true);
    }
  });

  it("flags low runway as a critical risk", () => {
    const project: Project = {
      ...exampleProject,
      funding: { ...exampleProject.funding, availableCash: known(5000) },
    };
    const metrics = calculateMetrics(project);
    const scores = calculateScoreBreakdown(project, metrics);
    const report = generateInsights(metrics, scores, project);
    expect(report.criticalRisks.some((i) => i.message.includes("runway"))).toBe(true);
  });

  it("never produces an empty recommendedActions list", () => {
    const metrics = calculateMetrics(exampleProject);
    const scores = calculateScoreBreakdown(exampleProject, metrics);
    const report = generateInsights(metrics, scores, exampleProject);
    expect(report.recommendedActions.length).toBeGreaterThan(0);
  });
});

describe("generateDecisionSummary", () => {
  it("always returns exactly 3 reasons", () => {
    const metrics = calculateMetrics(exampleProject);
    const scores = calculateScoreBreakdown(exampleProject, metrics);
    const summary = generateDecisionSummary(scores);
    expect(summary.reasons).toHaveLength(3);
  });

  it("returns a valid verdict enum value", () => {
    const metrics = calculateMetrics(exampleProject);
    const scores = calculateScoreBreakdown(exampleProject, metrics);
    const summary = generateDecisionSummary(scores);
    expect([
      "explore_further",
      "validate_before_building",
      "improve_economics",
      "strong_candidate",
      "high_risk",
    ]).toContain(summary.verdict);
  });
});
