import { describe, expect, it } from "vitest";
import { calculateRetentionMetrics } from "../retention";
import { known } from "@/types";

describe("calculateRetentionMetrics", () => {
  it("computes customer lifetime months from monthly churn", () => {
    const m = calculateRetentionMetrics({ monthlyChurnPct: known(5) });
    expect(m.customerLifetimeMonths).toBeCloseTo(20, 5);
  });

  it("handles zero churn safely, returning null lifetime instead of Infinity", () => {
    const m = calculateRetentionMetrics({ monthlyChurnPct: known(0) });
    expect(m.customerLifetimeMonths).toBeNull();
  });

  it("approximates monthly churn from annual churn when monthly is not provided", () => {
    const m = calculateRetentionMetrics({
      monthlyChurnPct: { value: 0, quality: "unknown" },
      annualChurnPct: known(45.07),
    });
    expect(m.monthlyChurnPct).toBeCloseTo(5, 0);
  });

  it("respects an explicit average customer lifetime override", () => {
    const m = calculateRetentionMetrics({
      monthlyChurnPct: known(5),
      averageCustomerLifetimeMonths: known(30),
    });
    expect(m.customerLifetimeMonths).toBe(30);
  });

  it("computes NRR above 100% when expansion outpaces churn and contraction", () => {
    const m = calculateRetentionMetrics({
      monthlyChurnPct: known(2),
      monthlyExpansionRevenuePct: known(5),
      monthlyContractionRevenuePct: known(0),
    });
    // Net monthly retention = 100 - 2 - 0 + 5 = 103%, compounded over 12 months.
    expect(m.netRevenueRetentionPct).toBeCloseTo(Math.pow(1.03, 12) * 100, 5);
    expect(m.netRevenueRetentionPct).toBeGreaterThan(100);
  });

  it("computes NRR below 100% when there is no expansion to offset churn", () => {
    const m = calculateRetentionMetrics({ monthlyChurnPct: known(5) });
    expect(m.netRevenueRetentionPct).toBeLessThan(100);
    expect(m.netRevenueRetentionPct).toBeCloseTo(Math.pow(0.95, 12) * 100, 5);
  });

  it("clamps net monthly retention at 0 instead of going negative before annualizing", () => {
    const m = calculateRetentionMetrics({
      monthlyChurnPct: known(80),
      monthlyContractionRevenuePct: known(80),
    });
    // 100 - 80 - 80 + 0 would be -60 without the clamp; an even exponent on a negative
    // base would otherwise produce a misleadingly positive NRR.
    expect(m.netRevenueRetentionPct).toBe(0);
  });
});
