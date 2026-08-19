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

  it("flags a critical risk when a funding round gives up more than 40% equity", () => {
    const project: Project = {
      ...exampleProject,
      funding: { ...exampleProject.funding, preMoneyValuation: known(600000), initialInvestment: known(500000) },
    };
    const metrics = calculateMetrics(project);
    const scores = calculateScoreBreakdown(project, metrics);
    const report = generateInsights(metrics, scores, project);
    expect(report.criticalRisks.some((i) => i.message.includes("unusually large equity stake"))).toBe(true);
  });

  it("does not raise a dilution insight when no round is modeled", () => {
    const metrics = calculateMetrics(exampleProject);
    const scores = calculateScoreBreakdown(exampleProject, metrics);
    const report = generateInsights(metrics, scores, exampleProject);
    const all = [...report.strengths, ...report.warnings, ...report.criticalRisks];
    expect(all.some((i) => i.message.toLowerCase().includes("equity"))).toBe(false);
  });

  it("flags a warning when marketplace take rate is below the typical range", () => {
    const project: Project = {
      ...exampleProject,
      basicInfo: { ...exampleProject.basicInfo, businessModel: "marketplace" },
      marketplace: {
        averageOrderValue: known(40),
        takeRatePct: known(5),
        transactionsPerCustomerPerMonth: known(2),
      },
    };
    const metrics = calculateMetrics(project);
    const scores = calculateScoreBreakdown(project, metrics);
    const report = generateInsights(metrics, scores, project);
    expect(report.warnings.some((i) => i.message.includes("Take rate is below"))).toBe(true);
  });

  it("flags a warning when net revenue retention is below a healthy level", () => {
    const project: Project = {
      ...exampleProject,
      retention: { ...exampleProject.retention, monthlyContractionRevenuePct: known(5) },
    };
    const metrics = calculateMetrics(project);
    const scores = calculateScoreBreakdown(project, metrics);
    const report = generateInsights(metrics, scores, project);
    expect(report.warnings.some((i) => i.message.includes("Net revenue retention is below"))).toBe(true);
  });

  it("does not raise an NRR insight when expansion/contraction were never entered", () => {
    const metrics = calculateMetrics(exampleProject);
    const scores = calculateScoreBreakdown(exampleProject, metrics);
    const report = generateInsights(metrics, scores, exampleProject);
    const all = [...report.strengths, ...report.warnings, ...report.opportunities];
    expect(all.some((i) => i.message.toLowerCase().includes("revenue retention"))).toBe(false);
  });

  it("flags a critical risk for severe customer concentration", () => {
    const project: Project = {
      ...exampleProject,
      pricing: { ...exampleProject.pricing, topCustomersRevenueSharePct: known(80) },
    };
    const metrics = calculateMetrics(project);
    const scores = calculateScoreBreakdown(project, metrics);
    const report = generateInsights(metrics, scores, project);
    expect(report.criticalRisks.some((i) => i.message.includes("heavily concentrated"))).toBe(true);
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

/**
 * With a revenue mix, an unreachable break-even is a statement about the
 * recurring half alone — one-time work can still carry the forecast into
 * positive cash flow. The wording has to say so, or the projection chart and
 * the break-even section read as a contradiction.
 */
describe("break-even reachability wording", () => {
  function mixProject(supportCost: number): Project {
    return {
      ...exampleProject,
      revenueStreams: [
        {
          id: "impl",
          name: "Implementation",
          kind: "one_time",
          price: known(20000),
          billingPeriod: "one_time",
          attachRatePct: known(100),
          unitsPerCustomerPerMonth: known(1),
          deliveryCostPct: known(50),
        },
        {
          id: "platform",
          name: "Platform",
          kind: "recurring",
          price: known(1000),
          billingPeriod: "monthly",
          attachRatePct: known(100),
          unitsPerCustomerPerMonth: known(1),
          deliveryCostPct: known(10),
        },
      ],
      unitEconomics: { ...exampleProject.unitEconomics, supportCostPerCustomer: known(supportCost) },
    };
  }

  function reportFor(project: Project) {
    const metrics = calculateMetrics(project);
    return { metrics, report: generateInsights(metrics, calculateScoreBreakdown(project, metrics), project) };
  }

  it("attributes an unreachable break-even to the subscriber base when one-time work carries it", () => {
    const { metrics, report } = reportFor(mixProject(2000));
    expect(metrics.breakEven.breakEvenCustomers).toBeNull();
    expect(metrics.unitEconomics.oneTimeGrossProfitPerCustomer).toBeGreaterThan(0);
    expect(
      report.criticalRisks.some((i) => i.message === "Break-even cannot be reached by growing the subscriber base.")
    ).toBe(true);
  });

  it("keeps the plain wording when there is no one-time contribution to explain", () => {
    const project: Project = {
      ...mixProject(2000),
      revenueStreams: mixProject(2000).revenueStreams!.filter((s) => s.kind !== "one_time"),
    };
    const { report } = reportFor(project);
    expect(report.criticalRisks.some((i) => i.message === "Break-even is currently mathematically unreachable.")).toBe(true);
  });
});
