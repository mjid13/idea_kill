import { describe, expect, it } from "vitest";
import { calculateFundingMetrics } from "../funding";
import { known } from "@/types";
import type { FundingAssumptions } from "@/types";

function baseFunding(overrides: Partial<FundingAssumptions> = {}): FundingAssumptions {
  return {
    availableCash: known(100000),
    initialInvestment: known(0),
    otherMonthlyIncome: known(0),
    ...overrides,
  };
}

describe("calculateFundingMetrics", () => {
  it("computes runway as available cash divided by monthly burn", () => {
    const m = calculateFundingMetrics(baseFunding(), 10000, false);
    expect(m.runwayMonths).toBeCloseTo(10, 5);
    expect(m.isProfitable).toBe(false);
  });

  it("reports profitable/no finite runway when burn is zero or negative", () => {
    const m = calculateFundingMetrics(baseFunding(), 0, true);
    expect(m.runwayMonths).toBeNull();
    expect(m.isProfitable).toBe(true);
  });

  it("reduces effective burn using other monthly income", () => {
    const m = calculateFundingMetrics(baseFunding({ otherMonthlyIncome: known(10000) }), 10000, false);
    expect(m.runwayMonths).toBeNull();
    expect(m.isProfitable).toBe(true);
  });

  it("includes initial investment in available cash", () => {
    const m = calculateFundingMetrics(baseFunding({ initialInvestment: known(50000) }), 15000, false);
    expect(m.runwayMonths).toBeCloseTo(150000 / 15000, 5);
  });
});
