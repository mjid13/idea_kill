import { describe, expect, it } from "vitest";
import { calculateMarketplaceMetrics } from "../marketplace";
import { known, unknownValue } from "@/types";
import type { MarketplaceAssumptions, PricingAssumptions } from "@/types";

function basePricing(overrides: Partial<PricingAssumptions> = {}): PricingAssumptions {
  return {
    productPrice: known(0),
    billingPeriod: "monthly",
    currentCustomers: known(200),
    expectedCustomers12mo: known(400),
    expectedMonthlyCustomerGrowthPct: known(5),
    ...overrides,
  };
}

function baseMarketplace(overrides: Partial<MarketplaceAssumptions> = {}): MarketplaceAssumptions {
  return {
    averageOrderValue: known(40),
    takeRatePct: known(20),
    transactionsPerCustomerPerMonth: known(2),
    ...overrides,
  };
}

describe("calculateMarketplaceMetrics", () => {
  it("returns null when the marketplace slice is absent", () => {
    expect(calculateMarketplaceMetrics(undefined, basePricing())).toBeNull();
  });

  it("returns null when every field is still unknown", () => {
    const unset: MarketplaceAssumptions = {
      averageOrderValue: unknownValue(0),
      takeRatePct: unknownValue(0),
      transactionsPerCustomerPerMonth: unknownValue(0),
    };
    expect(calculateMarketplaceMetrics(unset, basePricing())).toBeNull();
  });

  it("computes GMV, take-rate revenue, and effective ARPU", () => {
    const m = calculateMarketplaceMetrics(baseMarketplace(), basePricing());
    expect(m).not.toBeNull();
    // GMV = 200 customers x 2 transactions x $40 AOV = $16,000
    expect(m!.gmv).toBe(16000);
    // Take-rate revenue = GMV x 20% = $3,200
    expect(m!.takeRateRevenue).toBe(3200);
    // Effective ARPU = $3,200 / 200 customers = $16
    expect(m!.effectiveArpu).toBe(16);
    expect(m!.takeRatePct).toBe(20);
  });

  it("does not divide by zero when there are no current customers", () => {
    const m = calculateMarketplaceMetrics(baseMarketplace(), basePricing({ currentCustomers: known(0) }));
    expect(m!.gmv).toBe(0);
    expect(m!.effectiveArpu).toBe(0);
  });
});
