import { describe, expect, it } from "vitest";
import { calculateConcentrationMetrics, concentrationRiskLevel } from "../concentration";
import { known } from "@/types";
import type { PricingAssumptions } from "@/types";

function basePricing(overrides: Partial<PricingAssumptions> = {}): PricingAssumptions {
  return {
    productPrice: known(50),
    billingPeriod: "monthly",
    currentCustomers: known(100),
    expectedCustomers12mo: known(200),
    expectedMonthlyCustomerGrowthPct: known(5),
    ...overrides,
  };
}

describe("concentrationRiskLevel", () => {
  it("classifies below 20% as low", () => {
    expect(concentrationRiskLevel(19.9)).toBe("low");
  });
  it("classifies exactly 20% as moderate (boundary is inclusive on the higher band)", () => {
    expect(concentrationRiskLevel(20)).toBe("moderate");
  });
  it("classifies exactly 40% as high", () => {
    expect(concentrationRiskLevel(40)).toBe("high");
  });
  it("classifies exactly 60% as severe", () => {
    expect(concentrationRiskLevel(60)).toBe("severe");
  });
});

describe("calculateConcentrationMetrics", () => {
  it("defaults to 0% / low risk when the field is unset", () => {
    const m = calculateConcentrationMetrics(basePricing());
    expect(m.topCustomersRevenueSharePct).toBe(0);
    expect(m.riskLevel).toBe("low");
  });

  it("reflects an entered concentration percentage", () => {
    const m = calculateConcentrationMetrics(basePricing({ topCustomersRevenueSharePct: known(72) }));
    expect(m.topCustomersRevenueSharePct).toBe(72);
    expect(m.riskLevel).toBe("severe");
  });
});
