import { describe, expect, it } from "vitest";
import { calculateFundingRequirement, roundUpToRaiseIncrement } from "../fundingRequirement";
import { calculateMetrics } from "../metrics";
import { createEmptyProject } from "@/lib/storage/factory";
import { estimated, known, unknownValue, type Project } from "@/types";

/**
 * Pre-revenue plan with a flat 5,000/month cost base and no customers, so the
 * expected requirement is arithmetic the test can state directly rather than
 * having to mirror the forecast engine.
 */
function preRevenueProject(overrides: Partial<Project["funding"]> = {}): Project {
  const project = createEmptyProject("saas", "OMR");
  return {
    ...project,
    costs: { ...project.costs, founderSalaries: known(5000) },
    funding: {
      availableCash: known(0),
      initialInvestment: known(0),
      otherMonthlyIncome: known(0),
      monthsToMilestone: estimated(12),
      safetyBufferMonths: estimated(3),
      receivableDays: unknownValue(0),
      capex: unknownValue(0),
      contingencyPct: estimated(0),
      ...overrides,
    },
  };
}

function requirementOf(project: Project) {
  return calculateFundingRequirement(project, calculateMetrics(project));
}

describe("calculateFundingRequirement", () => {
  it("sums operating spend over the milestone window plus a buffer of net burn", () => {
    const requirement = requirementOf(preRevenueProject());

    expect(requirement.monthsToMilestone).toBe(12);
    expect(requirement.operatingSpendToMilestone).toBeCloseTo(60_000, 5); // 12 x 5,000
    expect(requirement.safetyBuffer).toBeCloseTo(15_000, 5); // 3 x 5,000 net burn
    expect(requirement.expectedCashReceipts).toBeCloseTo(0, 5);
    expect(requirement.requiredFinancing).toBeCloseTo(75_000, 5);
  });

  it("adds CAPEX and subtracts cash already on hand", () => {
    const requirement = requirementOf(preRevenueProject({ capex: known(10_000), availableCash: known(25_000) }));

    expect(requirement.capex).toBe(10_000);
    expect(requirement.cashOnHand).toBe(25_000);
    expect(requirement.requiredFinancing).toBeCloseTo(60_000 + 15_000 + 10_000 - 25_000, 5);
  });

  it("excludes the round being sized from cash on hand", () => {
    const withRound = requirementOf(preRevenueProject({ initialInvestment: known(200_000) }));
    const withoutRound = requirementOf(preRevenueProject());

    expect(withRound.cashOnHand).toBe(0);
    expect(withRound.requiredFinancing).toBeCloseTo(withoutRound.requiredFinancing, 5);
  });

  it("treats other monthly income as a cash receipt over the window", () => {
    const requirement = requirementOf(preRevenueProject({ otherMonthlyIncome: known(1_000) }));

    expect(requirement.expectedCashReceipts).toBeCloseTo(12_000, 5);
    // Buffer shrinks too: net burn at the milestone month is 5,000 - 1,000.
    expect(requirement.safetyBuffer).toBeCloseTo(12_000, 5);
    expect(requirement.requiredFinancing).toBeCloseTo(60_000 + 12_000 - 12_000, 5);
  });

  it("charges working capital for the cash locked up in receivables", () => {
    const receivables = requirementOf(preRevenueProject({ receivableDays: known(60) }));

    // No revenue in this plan, so 60-day terms tie up nothing.
    expect(receivables.workingCapital).toBeCloseTo(0, 5);

    const project = preRevenueProject({ receivableDays: known(30) });
    const withRevenue: Project = {
      ...project,
      pricing: { ...project.pricing, productPrice: known(100), currentCustomers: known(20) },
      unitEconomics: { ...project.unitEconomics, revenuePerCustomer: known(100) },
    };
    const requirement = requirementOf(withRevenue);

    // 30 days of a 2,000/month revenue run rate.
    expect(requirement.workingCapital).toBeCloseTo(2_000, 5);
  });

  it("adds contingency on top of required financing and rounds the raise up", () => {
    const requirement = requirementOf(preRevenueProject({ contingencyPct: estimated(18), availableCash: known(12_000) }));

    expect(requirement.requiredFinancing).toBeCloseTo(63_000, 5);
    expect(requirement.contingencyPct).toBe(18);
    expect(requirement.contingencyAmount).toBeCloseTo(11_340, 5);
    // 63,000 + 18% = 74,340, rounded up to the nearest 5,000.
    expect(requirement.recommendedRaise).toBe(75_000);
  });

  it("reports a self-funded plan instead of a negative requirement", () => {
    const requirement = requirementOf(preRevenueProject({ availableCash: known(500_000) }));

    expect(requirement.requiredFinancing).toBe(0);
    expect(requirement.recommendedRaise).toBe(0);
    expect(requirement.isSelfFunded).toBe(true);
  });

  it("falls back to planning defaults when the inputs were never answered", () => {
    const project = preRevenueProject({
      monthsToMilestone: unknownValue(0),
      safetyBufferMonths: unknownValue(0),
      contingencyPct: unknownValue(0),
    });
    const requirement = requirementOf(project);

    expect(requirement.monthsToMilestone).toBe(12);
    expect(requirement.safetyBuffer).toBeCloseTo(15_000, 5); // 3-month default
    expect(requirement.contingencyPct).toBe(18);
  });

  it("works for a project saved before the requirement inputs existed", () => {
    const project = preRevenueProject();
    const legacy: Project = {
      ...project,
      funding: { availableCash: known(0), initialInvestment: known(0), otherMonthlyIncome: known(0) },
    };
    const requirement = requirementOf(legacy);

    expect(requirement.monthsToMilestone).toBe(12);
    expect(requirement.requiredFinancing).toBeCloseTo(75_000, 5);
    expect(requirement.contingencyPct).toBe(18);
  });

  it("honors a shorter milestone window", () => {
    const requirement = requirementOf(preRevenueProject({ monthsToMilestone: known(6) }));

    expect(requirement.monthsToMilestone).toBe(6);
    expect(requirement.operatingSpendToMilestone).toBeCloseTo(30_000, 5);
    expect(requirement.requiredFinancing).toBeCloseTo(45_000, 5);
  });
});

describe("roundUpToRaiseIncrement", () => {
  it("scales the rounding increment with the size of the raise", () => {
    expect(roundUpToRaiseIncrement(7_100)).toBe(7_500);
    expect(roundUpToRaiseIncrement(74_340)).toBe(75_000);
    expect(roundUpToRaiseIncrement(263_000)).toBe(275_000);
    expect(roundUpToRaiseIncrement(2_140_000)).toBe(2_200_000);
  });

  it("returns 0 for nothing to raise", () => {
    expect(roundUpToRaiseIncrement(0)).toBe(0);
    expect(roundUpToRaiseIncrement(-5_000)).toBe(0);
  });
});
