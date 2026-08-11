import { describe, expect, it } from "vitest";
import { calculateRevenueMetrics } from "../pricing";
import { known } from "@/types";
import type { PricingAssumptions } from "@/types";

function basePricing(overrides: Partial<PricingAssumptions> = {}): PricingAssumptions {
  return {
    productPrice: known(100),
    billingPeriod: "monthly",
    currentCustomers: known(50),
    expectedCustomers12mo: known(200),
    expectedMonthlyCustomerGrowthPct: known(10),
    ...overrides,
  };
}

describe("calculateRevenueMetrics", () => {
  it("computes MRR/ARR from the cumulative customer base for recurring billing", () => {
    const m = calculateRevenueMetrics(basePricing(), 5);
    expect(m.mrr).toBe(100 * 50);
    expect(m.arr).toBe(m.mrr * 12);
    expect(m.monthlyRevenue).toBe(m.mrr);
  });

  it("normalizes annual billing to a monthly ARPU before computing MRR", () => {
    const m = calculateRevenueMetrics(basePricing({ productPrice: known(1200), billingPeriod: "annual" }), 5);
    expect(m.monthlyArpu).toBeCloseTo(100, 5);
    expect(m.mrr).toBe(100 * 50);
  });

  it("drives one-time-purchase revenue from new customers this month, not the cumulative customer count", () => {
    // Regression: revenue previously used the cumulative `currentCustomers`
    // count, implying every past purchaser re-buys every month.
    const m = calculateRevenueMetrics(basePricing({ billingPeriod: "one_time", currentCustomers: known(500) }), 5);
    expect(m.monthlyRevenue).toBe(100 * 5);
    expect(m.annualRevenue).toBe(m.monthlyRevenue * 12);
    expect(m.mrr).toBe(0);
    expect(m.arr).toBe(0);
  });

  it("reports zero one-time revenue when there are no new customers this month, regardless of past customers", () => {
    const m = calculateRevenueMetrics(basePricing({ billingPeriod: "one_time", currentCustomers: known(500) }), 0);
    expect(m.monthlyRevenue).toBe(0);
  });
});
