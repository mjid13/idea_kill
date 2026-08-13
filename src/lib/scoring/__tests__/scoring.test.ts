import { describe, expect, it } from "vitest";
import { classifyScore, calculateScoreBreakdown } from "../index";
import { scoreUnitEconomics } from "../unitEconomics";
import { scoreMarketOpportunity } from "../market";
import { scoreRisk } from "../risk";
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

describe("scoreMarketOpportunity — currency normalization", () => {
  it("scores identical SAM/SOM higher in a stronger currency (OMR) than in USD", () => {
    const metrics = calculateMetrics(exampleProject);
    const usdScore = scoreMarketOpportunity(metrics, exampleProject.validation, "USD");
    const omrScore = scoreMarketOpportunity(metrics, exampleProject.validation, "OMR");
    expect(omrScore.score).toBeGreaterThan(usdScore.score);
  });

  it("scores identical SAM/SOM lower in a weaker currency (AED) than in USD", () => {
    const metrics = calculateMetrics(exampleProject);
    const usdScore = scoreMarketOpportunity(metrics, exampleProject.validation, "USD");
    const aedScore = scoreMarketOpportunity(metrics, exampleProject.validation, "AED");
    expect(aedScore.score).toBeLessThanOrEqual(usdScore.score);
  });
});

describe("scoreUnitEconomics — null CAC payback handling", () => {
  const baseMetrics = calculateMetrics(exampleProject);

  function withUnitEconomics(overrides: Partial<CalculatedMetrics["unitEconomics"]>): CalculatedMetrics {
    return { ...baseMetrics, unitEconomics: { ...baseMetrics.unitEconomics, ...overrides } };
  }

  it("treats a null payback with positive gross profit per customer as neutral (no data entered yet)", () => {
    const metrics = withUnitEconomics({ cacPaybackMonths: null, grossProfitPerCustomer: 20 });
    const score = scoreUnitEconomics(metrics, exampleProject.basicInfo.businessModel, exampleProject.retention);
    const factor = score.factors.find((f) => f.label === "CAC payback period")!;
    expect(factor.score).toBe(40);
  });

  it("penalizes a null payback when gross profit per customer is negative (economics are broken, not just missing data)", () => {
    const metrics = withUnitEconomics({ cacPaybackMonths: null, grossProfitPerCustomer: -5 });
    const score = scoreUnitEconomics(metrics, exampleProject.basicInfo.businessModel, exampleProject.retention);
    const factor = score.factors.find((f) => f.label === "CAC payback period")!;
    expect(factor.score).toBe(0);
  });
});

describe("scoreUnitEconomics — gated NRR factor", () => {
  it("does not add an NRR factor when expansion/contraction were never entered (zero regression for existing projects)", () => {
    const metrics = calculateMetrics(exampleProject);
    const score = scoreUnitEconomics(metrics, exampleProject.basicInfo.businessModel, exampleProject.retention);
    expect(score.factors.some((f) => f.label === "Net revenue retention")).toBe(false);
  });

  it("adds a gated NRR factor once expansion or contraction data is entered", () => {
    const retention = { ...exampleProject.retention, monthlyExpansionRevenuePct: known(5) };
    const project: Project = { ...exampleProject, retention };
    const metrics = calculateMetrics(project);
    const score = scoreUnitEconomics(metrics, project.basicInfo.businessModel, retention);
    expect(score.factors.some((f) => f.label === "Net revenue retention")).toBe(true);
  });

  it("feeds marketplace take rate into the gross margin factor instead of the generic gross margin", () => {
    const project: Project = {
      ...exampleProject,
      basicInfo: { ...exampleProject.basicInfo, businessModel: "marketplace" },
      marketplace: {
        averageOrderValue: known(40),
        takeRatePct: known(20),
        transactionsPerCustomerPerMonth: known(2),
      },
    };
    const metrics = calculateMetrics(project);
    const marketplaceScore = scoreUnitEconomics(metrics, "marketplace", project.retention);
    const saasScore = scoreUnitEconomics({ ...metrics, marketplace: null }, "marketplace", project.retention);
    const marketplaceFactor = marketplaceScore.factors.find((f) => f.label === "Gross margin")!;
    const saasFactor = saasScore.factors.find((f) => f.label === "Gross margin")!;
    expect(marketplaceFactor.score).not.toBe(saasFactor.score);
  });
});

describe("scoreRisk — gated concentration factor", () => {
  it("does not add a concentration factor when it was never entered (zero regression for existing projects)", () => {
    const score = scoreRisk(exampleProject.risk, exampleProject.pricing);
    expect(score.factors.some((f) => f.label === "Customer concentration")).toBe(false);
  });

  it("adds a gated concentration factor once entered, and penalizes severe concentration", () => {
    const pricing = { ...exampleProject.pricing, topCustomersRevenueSharePct: known(75) };
    const score = scoreRisk(exampleProject.risk, pricing);
    const factor = score.factors.find((f) => f.label === "Customer concentration");
    expect(factor).toBeDefined();
    expect(factor!.score).toBe(0);
  });
});
