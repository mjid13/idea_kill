import { describe, expect, it } from "vitest";
import { calculateUnitEconomicsMetrics } from "../unitEconomics";
import { known } from "@/types";
import type { UnitEconomicsAssumptions } from "@/types";

function baseUnitEconomics(overrides: Partial<UnitEconomicsAssumptions> = {}): UnitEconomicsAssumptions {
  return {
    revenuePerCustomer: known(50),
    directCostPerCustomer: known(8),
    paymentProcessingPct: known(3),
    infrastructureCostPerCustomer: known(2),
    supportCostPerCustomer: known(1),
    otherVariableCostPerCustomer: known(0),
    ...overrides,
  };
}

describe("calculateUnitEconomicsMetrics", () => {
  it("computes gross profit and margin per customer", () => {
    const m = calculateUnitEconomicsMetrics(baseUnitEconomics(), 50, 100, 3);
    // variable cost = 8 + 1.5(3% of 50) + 2 + 1 = 12.5
    expect(m.variableCostPerCustomer).toBeCloseTo(12.5, 5);
    expect(m.grossProfitPerCustomer).toBeCloseTo(37.5, 5);
    expect(m.grossMarginPct).toBeCloseTo(75, 5);
  });

  it("computes LTV using contribution margin, not raw revenue", () => {
    const m = calculateUnitEconomicsMetrics(baseUnitEconomics(), 50, 100, 5);
    // ltv = arpu * grossMargin% / churn% = 50 * 0.75 / 0.05 = 750
    expect(m.ltv).toBeCloseTo(750, 5);
  });

  it("computes LTV:CAC ratio", () => {
    const m = calculateUnitEconomicsMetrics(baseUnitEconomics(), 50, 100, 5);
    expect(m.ltvToCacRatio).toBeCloseTo(7.5, 5);
  });

  it("computes CAC payback period in months", () => {
    const m = calculateUnitEconomicsMetrics(baseUnitEconomics(), 50, 100, 5);
    expect(m.cacPaybackMonths).toBeCloseTo(100 / 37.5, 5);
  });

  it("handles zero churn without dividing by zero (finite, capped LTV)", () => {
    const m = calculateUnitEconomicsMetrics(baseUnitEconomics(), 50, 100, 0);
    expect(Number.isFinite(m.ltv)).toBe(true);
    expect(m.ltv).toBeGreaterThan(0);
  });

  it("handles zero CAC without producing NaN/Infinity for LTV:CAC", () => {
    const m = calculateUnitEconomicsMetrics(baseUnitEconomics(), 50, 0, 5);
    expect(m.ltvToCacRatio).toBeNull();
  });

  it("propagates a null CAC (unknown, e.g. spend with zero acquired customers) to LTV:CAC and payback instead of treating it as instant/free", () => {
    const m = calculateUnitEconomicsMetrics(baseUnitEconomics(), 50, null, 5);
    expect(m.ltvToCacRatio).toBeNull();
    expect(m.cacPaybackMonths).toBeNull();
  });

  it("handles zero revenue per customer without NaN gross margin", () => {
    const m = calculateUnitEconomicsMetrics(
      baseUnitEconomics({ revenuePerCustomer: known(0) }),
      0,
      100,
      5
    );
    expect(Number.isNaN(m.grossMarginPct)).toBe(false);
  });
});
