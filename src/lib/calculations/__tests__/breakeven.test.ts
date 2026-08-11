import { describe, expect, it } from "vitest";
import { calculateBreakEvenMetrics } from "../breakeven";

describe("calculateBreakEvenMetrics", () => {
  it("computes break-even customers and revenue", () => {
    const m = calculateBreakEvenMetrics(12000, 40, 50, 50);
    expect(m.breakEvenCustomers).toBe(300); // 12000 / 40
    expect(m.breakEvenRevenue).toBe(300 * 50);
    expect(m.remainingCustomersToBreakEven).toBe(250);
  });

  it("returns null instead of Infinity when contribution margin is zero", () => {
    const m = calculateBreakEvenMetrics(12000, 0, 50, 50);
    expect(m.breakEvenCustomers).toBeNull();
    expect(m.breakEvenRevenue).toBeNull();
  });

  it("returns null (unreachable) rather than 0 when contribution margin per customer is negative", () => {
    // Every customer loses money before fixed costs are even considered —
    // break-even must never read as "0 customers away" for this case.
    const m = calculateBreakEvenMetrics(12000, -10, 50, 50);
    expect(m.breakEvenCustomers).toBeNull();
    expect(m.breakEvenRevenue).toBeNull();
    expect(m.remainingCustomersToBreakEven).toBeNull();
  });

  it("returns 0 remaining customers when already past break-even", () => {
    const m = calculateBreakEvenMetrics(1000, 40, 50, 100);
    expect(m.remainingCustomersToBreakEven).toBe(0);
  });
});
