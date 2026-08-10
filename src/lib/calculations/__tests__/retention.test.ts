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
});
