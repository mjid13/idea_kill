import { describe, expect, it } from "vitest";
import { calculateDilutionMetrics } from "../dilution";
import { known, unknownValue } from "@/types";
import type { FundingAssumptions } from "@/types";

function baseFunding(overrides: Partial<FundingAssumptions> = {}): FundingAssumptions {
  return {
    availableCash: known(100000),
    initialInvestment: known(0),
    otherMonthlyIncome: known(0),
    preMoneyValuation: unknownValue(0),
    ...overrides,
  };
}

describe("calculateDilutionMetrics", () => {
  it("returns null for everything when pre-money valuation is unknown", () => {
    const m = calculateDilutionMetrics(baseFunding());
    expect(m.postMoneyValuation).toBeNull();
    expect(m.equityGivenUpPct).toBeNull();
    expect(m.founderRemainingOwnershipPct).toBeNull();
  });

  it("computes post-money valuation and equity given up from pre-money + investment", () => {
    const m = calculateDilutionMetrics(
      baseFunding({ preMoneyValuation: known(4000000), initialInvestment: known(1000000) })
    );
    expect(m.postMoneyValuation).toBe(5000000);
    expect(m.equityGivenUpPct).toBeCloseTo(20, 5);
    expect(m.founderRemainingOwnershipPct).toBeCloseTo(80, 5);
  });

  it("treats a $0 raise against a known pre-money as 0% dilution, not unknown", () => {
    const m = calculateDilutionMetrics(baseFunding({ preMoneyValuation: known(4000000), initialInvestment: known(0) }));
    expect(m.postMoneyValuation).toBe(4000000);
    expect(m.equityGivenUpPct).toBe(0);
    expect(m.founderRemainingOwnershipPct).toBe(100);
  });
});
