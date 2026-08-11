import { describe, expect, it } from "vitest";
import { classifyScore, calculateScoreBreakdown } from "../index";
import { scoreUnitEconomics } from "../unitEconomics";
import { calculateMetrics } from "@/lib/calculations/metrics";
import { exampleProject } from "@/lib/example";
import { known, type CalculatedMetrics, type Project } from "@/types";

describe("classifyScore boundaries", () => {
  it("classifies 0-39 as High Risk", () => {
    expect(classifyScore(0)).toBe("High Risk");
    expect(classifyScore(39)).toBe("High Risk");
  });
  it("classifies 40-54 as Weak", () => {
    expect(classifyScore(40)).toBe("Weak");
    expect(classifyScore(54)).toBe("Weak");
  });
  it("classifies 55-69 as Promising", () => {
    expect(classifyScore(55)).toBe("Promising");
    expect(classifyScore(69)).toBe("Promising");
  });
  it("classifies 70-84 as Strong", () => {
    expect(classifyScore(70)).toBe("Strong");
    expect(classifyScore(84)).toBe("Strong");
  });
  it("classifies 85-100 as Very Strong", () => {
    expect(classifyScore(85)).toBe("Very Strong");
    expect(classifyScore(100)).toBe("Very Strong");
  });
});

describe("calculateScoreBreakdown", () => {
  it("produces an overall score between 0 and 100 for the example project", () => {
    const metrics = calculateMetrics(exampleProject);
    const breakdown = calculateScoreBreakdown(exampleProject, metrics);
    expect(breakdown.overall).toBeGreaterThanOrEqual(0);
    expect(breakdown.overall).toBeLessThanOrEqual(100);
  });

  it("every category score is between 0 and 100", () => {
    const metrics = calculateMetrics(exampleProject);
    const breakdown = calculateScoreBreakdown(exampleProject, metrics);
    for (const category of Object.values(breakdown.categories)) {
      expect(category.score).toBeGreaterThanOrEqual(0);
      expect(category.score).toBeLessThanOrEqual(100);
    }
  });

  it("category weights sum to 1", () => {
    const metrics = calculateMetrics(exampleProject);
    const breakdown = calculateScoreBreakdown(exampleProject, metrics);
    const totalWeight = Object.values(breakdown.categories).reduce((s, c) => s + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 5);
  });

  it("a worst-case project (all 1-ratings, no revenue, no market) scores near the bottom", () => {
    const worst: Project = {
      ...exampleProject,
      market: {
        totalPotentialCustomers: known(0),
        averageAnnualCustomerSpend: known(0),
        addressableMarketPct: known(0),
        obtainableMarketPct: known(0),
        targetCustomers: known(0),
      },
      pricing: { ...exampleProject.pricing, currentCustomers: known(0) },
      validation: Object.fromEntries(
        Object.keys(exampleProject.validation).map((k) => [k, k === "competitionIntensity" ? 5 : 1])
      ) as unknown as Project["validation"],
      team: Object.fromEntries(Object.keys(exampleProject.team).map((k) => [k, 1])) as unknown as Project["team"],
      risk: Object.fromEntries(Object.keys(exampleProject.risk).map((k) => [k, 5])) as unknown as Project["risk"],
    };
    const metrics = calculateMetrics(worst);
    const breakdown = calculateScoreBreakdown(worst, metrics);
    expect(breakdown.overall).toBeLessThan(35);
    expect(classifyScore(breakdown.overall)).toBe("High Risk");
  });

  it("confidence is 0-100 and independent of the viability score", () => {
    const metrics = calculateMetrics(exampleProject);
    const breakdown = calculateScoreBreakdown(exampleProject, metrics);
    expect(breakdown.confidence).toBeGreaterThanOrEqual(0);
    expect(breakdown.confidence).toBeLessThanOrEqual(100);
  });

  it("maturity stage is between 0 and 5", () => {
    const metrics = calculateMetrics(exampleProject);
    const breakdown = calculateScoreBreakdown(exampleProject, metrics);
    expect(breakdown.maturityStage.stage).toBeGreaterThanOrEqual(0);
    expect(breakdown.maturityStage.stage).toBeLessThanOrEqual(5);
  });
});

describe("scoreUnitEconomics — null CAC payback handling", () => {
  const baseMetrics = calculateMetrics(exampleProject);

  function withUnitEconomics(overrides: Partial<CalculatedMetrics["unitEconomics"]>): CalculatedMetrics {
    return { ...baseMetrics, unitEconomics: { ...baseMetrics.unitEconomics, ...overrides } };
  }

  it("treats a null payback with positive gross profit per customer as neutral (no data entered yet)", () => {
    const metrics = withUnitEconomics({ cacPaybackMonths: null, grossProfitPerCustomer: 20 });
    const score = scoreUnitEconomics(metrics, exampleProject.basicInfo.businessModel);
    const factor = score.factors.find((f) => f.label === "CAC payback period")!;
    expect(factor.score).toBe(40);
  });

  it("penalizes a null payback when gross profit per customer is negative (economics are broken, not just missing data)", () => {
    const metrics = withUnitEconomics({ cacPaybackMonths: null, grossProfitPerCustomer: -5 });
    const score = scoreUnitEconomics(metrics, exampleProject.basicInfo.businessModel);
    const factor = score.factors.find((f) => f.label === "CAC payback period")!;
    expect(factor.score).toBe(0);
  });
});
