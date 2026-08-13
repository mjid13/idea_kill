import { describe, expect, it } from "vitest";
import { calculateEfficiencyMetrics } from "../efficiency";
import { calculateMetrics } from "../metrics";
import { forecastProject } from "../projectForecast";
import { exampleProject } from "@/lib/example";
import { known } from "@/types";
import type { Project } from "@/types";

describe("calculateEfficiencyMetrics", () => {
  it("returns all-null when the business model is not recurring", () => {
    const oneTime: Project = {
      ...exampleProject,
      pricing: { ...exampleProject.pricing, billingPeriod: "one_time" },
    };
    const metrics = calculateMetrics(oneTime);
    const forecast = forecastProject(oneTime, metrics, 12);
    const efficiency = calculateEfficiencyMetrics(oneTime, metrics, forecast);
    expect(efficiency).toEqual({
      annualGrowthPct: null,
      profitMarginPct: null,
      ruleOf40Score: null,
      burnMultiple: null,
      magicNumber: null,
      quickRatio: null,
    });
  });

  it("computes finite ratios for a growing recurring-revenue business", () => {
    const metrics = calculateMetrics(exampleProject);
    const forecast = forecastProject(exampleProject, metrics, 12);
    const efficiency = calculateEfficiencyMetrics(exampleProject, metrics, forecast);

    expect(efficiency.annualGrowthPct).not.toBeNull();
    expect(Number.isFinite(efficiency.annualGrowthPct)).toBe(true);
    expect(Number.isFinite(efficiency.profitMarginPct)).toBe(true);
    expect(Number.isFinite(efficiency.ruleOf40Score)).toBe(true);
    // The example project grows every month with positive new customers, so it should
    // show positive net-new ARR and therefore a defined (not null) Magic Number.
    expect(efficiency.magicNumber).not.toBeNull();
  });

  it("uses opex marketing/sales spend for Magic Number, not the separate CAC-only acquisition spend", () => {
    // Two projects with identical acquisition (CAC) spend but different opex marketing/sales
    // spend must produce different Magic Numbers — proves the denominator is sourced from
    // project.costs, not project.acquisition.
    const projectA: Project = {
      ...exampleProject,
      costs: { ...exampleProject.costs, marketing: known(1000), sales: known(0) },
    };
    const projectB: Project = {
      ...exampleProject,
      costs: { ...exampleProject.costs, marketing: known(20000), sales: known(0) },
    };

    const metricsA = calculateMetrics(projectA);
    const forecastA = forecastProject(projectA, metricsA, 12);
    const efficiencyA = calculateEfficiencyMetrics(projectA, metricsA, forecastA);

    const metricsB = calculateMetrics(projectB);
    const forecastB = forecastProject(projectB, metricsB, 12);
    const efficiencyB = calculateEfficiencyMetrics(projectB, metricsB, forecastB);

    expect(efficiencyA.magicNumber).not.toBeNull();
    expect(efficiencyB.magicNumber).not.toBeNull();
    expect(efficiencyA.magicNumber).not.toBeCloseTo(efficiencyB.magicNumber!, 2);
  });

  it("computes Quick Ratio using expansion/contraction revenue from the forecast", () => {
    const withExpansion: Project = {
      ...exampleProject,
      retention: { ...exampleProject.retention, monthlyExpansionRevenuePct: known(5), monthlyContractionRevenuePct: known(0) },
    };
    const withoutExpansion: Project = {
      ...exampleProject,
      retention: { ...exampleProject.retention, monthlyExpansionRevenuePct: known(0), monthlyContractionRevenuePct: known(0) },
    };

    const metricsWith = calculateMetrics(withExpansion);
    const forecastWith = forecastProject(withExpansion, metricsWith, 12);
    const efficiencyWith = calculateEfficiencyMetrics(withExpansion, metricsWith, forecastWith);

    const metricsWithout = calculateMetrics(withoutExpansion);
    const forecastWithout = forecastProject(withoutExpansion, metricsWithout, 12);
    const efficiencyWithout = calculateEfficiencyMetrics(withoutExpansion, metricsWithout, forecastWithout);

    expect(efficiencyWith.quickRatio).not.toBeNull();
    expect(efficiencyWith.quickRatio!).toBeGreaterThan(efficiencyWithout.quickRatio!);
  });
});
