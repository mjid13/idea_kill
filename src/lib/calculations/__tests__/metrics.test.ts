import { describe, expect, it } from "vitest";
import { calculateMetrics } from "../metrics";
import { exampleProject } from "@/lib/example";
import { known } from "@/types";
import type { Project } from "@/types";

function marketplaceProject(): Project {
  return {
    ...exampleProject,
    basicInfo: { ...exampleProject.basicInfo, businessModel: "marketplace" },
    pricing: { ...exampleProject.pricing, currentCustomers: known(200) },
    marketplace: {
      averageOrderValue: known(40),
      takeRatePct: known(20),
      transactionsPerCustomerPerMonth: known(2),
    },
  };
}

describe("calculateMetrics — marketplace override ordering", () => {
  it("overrides revenue.monthlyArpu/mrr/arr with GMV take-rate figures for marketplace projects", () => {
    const metrics = calculateMetrics(marketplaceProject());
    expect(metrics.marketplace).not.toBeNull();
    expect(metrics.revenue.monthlyArpu).toBe(metrics.marketplace!.effectiveArpu);
    expect(metrics.revenue.mrr).toBe(metrics.marketplace!.takeRateRevenue);
    expect(metrics.revenue.arr).toBe(metrics.marketplace!.takeRateRevenue * 12);
  });

  it("propagates the corrected ARPU into LTV, not the SaaS-style baseline ARPU", () => {
    const project = marketplaceProject();
    const metrics = calculateMetrics(project);

    // A baseline (non-marketplace) calculation with the same unitEconomics/retention
    // inputs would use pricing.productPrice-derived ARPU instead — confirm the actual
    // LTV was computed against the corrected, GMV-derived ARPU rather than that baseline.
    const saasEquivalent = calculateMetrics({ ...project, basicInfo: { ...project.basicInfo, businessModel: "saas" } });
    expect(metrics.unitEconomics.ltv).not.toBe(saasEquivalent.unitEconomics.ltv);
  });

  it("propagates the corrected ARPU into break-even revenue", () => {
    const project = marketplaceProject();
    const metrics = calculateMetrics(project);
    if (metrics.breakEven.breakEvenCustomers !== null) {
      expect(metrics.breakEven.breakEvenRevenue).toBeCloseTo(
        metrics.breakEven.breakEvenCustomers * metrics.marketplace!.effectiveArpu,
        5
      );
    }
  });

  it("does not compute marketplace metrics for non-marketplace business models", () => {
    const metrics = calculateMetrics(exampleProject);
    expect(metrics.marketplace).toBeNull();
  });
});
