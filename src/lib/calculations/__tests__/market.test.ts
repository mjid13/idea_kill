import { describe, expect, it } from "vitest";
import { calculateMarketMetrics } from "../market";
import { known } from "@/types";
import type { MarketAssumptions } from "@/types";

function baseMarket(overrides: Partial<MarketAssumptions> = {}): MarketAssumptions {
  return {
    totalPotentialCustomers: known(100000),
    averageAnnualCustomerSpend: known(600),
    addressableMarketPct: known(20),
    obtainableMarketPct: known(5),
    targetCustomers: known(300),
    ...overrides,
  };
}

describe("calculateMarketMetrics", () => {
  it("computes TAM/SAM/SOM from bottom-up inputs", () => {
    const metrics = calculateMarketMetrics(baseMarket());
    expect(metrics.tam).toBe(100000 * 600);
    expect(metrics.sam).toBe(metrics.tam * 0.2);
    expect(metrics.som).toBe(metrics.sam * 0.05);
  });

  it("computes required market penetration relative to addressable customers", () => {
    const metrics = calculateMarketMetrics(baseMarket());
    // addressable customers = 100000 * 0.2 = 20000; target = 300 -> 1.5%
    expect(metrics.requiredMarketPenetrationPct).toBeCloseTo(1.5, 5);
  });

  it("respects direct TAM/SAM/SOM overrides", () => {
    const metrics = calculateMarketMetrics(
      baseMarket({ tamOverride: 1_000_000, samOverride: 200_000, somOverride: 10_000 })
    );
    expect(metrics.tam).toBe(1_000_000);
    expect(metrics.sam).toBe(200_000);
    expect(metrics.som).toBe(10_000);
  });

  it("never returns negative values or NaN when inputs are zero", () => {
    const metrics = calculateMarketMetrics(
      baseMarket({
        totalPotentialCustomers: known(0),
        addressableMarketPct: known(0),
      })
    );
    expect(metrics.tam).toBe(0);
    expect(metrics.requiredMarketPenetrationPct).toBe(0);
    expect(Number.isNaN(metrics.requiredMarketPenetrationPct)).toBe(false);
  });
});
