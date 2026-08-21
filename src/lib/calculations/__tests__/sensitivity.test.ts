import { describe, expect, it } from "vitest";
import { applyMultipliers, calculateSensitivityRanking, DEFAULT_MULTIPLIERS } from "../sensitivity";
import { exampleProject } from "@/lib/example";
import { estimated, known } from "@/types";
import type { Project, RevenueStream } from "@/types";

function stream(overrides: Partial<RevenueStream> & Pick<RevenueStream, "id" | "kind">): RevenueStream {
  return {
    name: overrides.id,
    price: known(0),
    billingPeriod: "monthly",
    attachRatePct: estimated(100),
    unitsPerCustomerPerMonth: estimated(1),
    deliveryCostPct: known(0),
    ...overrides,
  };
}

function projectWithRevenueStreams(): Project {
  // Priced close to CAC so unit-economics scores aren't already saturated at
  // the low or high end of the benchmark curves — otherwise a real ±50% price
  // swing could get masked by a ceiling/floor effect unrelated to the bug.
  return {
    ...exampleProject,
    revenueStreams: [stream({ id: "platform", kind: "recurring", name: "Platform", price: known(30), deliveryCostPct: known(50) })],
  };
}

function projectWithMarketplace(): Project {
  return {
    ...exampleProject,
    basicInfo: { ...exampleProject.basicInfo, businessModel: "marketplace" },
    marketplace: {
      averageOrderValue: known(80),
      takeRatePct: known(15),
      transactionsPerCustomerPerMonth: known(2),
    },
  };
}

describe("applyMultipliers — price lever reaches the operative pricing model", () => {
  it("scales revenue stream prices, not just the unused flat pricing fields", () => {
    const project = projectWithRevenueStreams();
    const flexed = applyMultipliers(project, { ...DEFAULT_MULTIPLIERS, price: 1.5 });

    expect(flexed.revenueStreams![0].price.value).toBeCloseTo(45, 6);
  });

  it("scales marketplace average order value", () => {
    const project = projectWithMarketplace();
    const flexed = applyMultipliers(project, { ...DEFAULT_MULTIPLIERS, price: 1.5 });

    expect(flexed.marketplace!.averageOrderValue.value).toBeCloseTo(120, 6);
  });

  it("leaves streams/marketplace untouched when the project has neither", () => {
    const flexed = applyMultipliers(exampleProject, { ...DEFAULT_MULTIPLIERS, price: 1.5 });
    expect(flexed.revenueStreams).toBe(exampleProject.revenueStreams);
    expect(flexed.marketplace).toBe(exampleProject.marketplace);
  });
});

describe("calculateSensitivityRanking — pricing lever moves the score for hybrid/marketplace projects", () => {
  it("reports a nonzero pricing impact for a revenue-stream project", () => {
    const ranking = calculateSensitivityRanking(projectWithRevenueStreams());
    const pricing = ranking.find((r) => r.key === "price")!;
    expect(pricing.impact).toBeGreaterThan(0);
  });

  it("reports a nonzero pricing impact for a marketplace project", () => {
    const ranking = calculateSensitivityRanking(projectWithMarketplace());
    const pricing = ranking.find((r) => r.key === "price")!;
    expect(pricing.impact).toBeGreaterThan(0);
  });
});
