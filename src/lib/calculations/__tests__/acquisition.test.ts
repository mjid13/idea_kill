import { describe, expect, it } from "vitest";
import { calculateAcquisitionMetrics } from "../acquisition";
import { known, unknownValue } from "@/types";
import type { AcquisitionAssumptions } from "@/types";

function baseAcquisition(overrides: Partial<AcquisitionAssumptions> = {}): AcquisitionAssumptions {
  return {
    monthlyMarketingSpend: known(4000),
    monthlySalesSpend: known(2000),
    newCustomersAcquiredMonthly: known(30),
    ...overrides,
  };
}

describe("calculateAcquisitionMetrics", () => {
  it("computes CAC from marketing + sales spend divided by new customers", () => {
    const m = calculateAcquisitionMetrics(baseAcquisition());
    expect(m.cac).toBeCloseTo(200, 5);
  });

  it("returns null CAC (not 0, not NaN/Infinity) when spend was made but no customers were acquired", () => {
    // CAC is unknown/effectively unbounded here, not free — a naive fallback
    // of 0 would make CAC payback read as instant in downstream scoring.
    const m = calculateAcquisitionMetrics(baseAcquisition({ newCustomersAcquiredMonthly: known(0) }));
    expect(m.cac).toBeNull();
  });

  it("returns 0 CAC when neither spend nor customers have been entered", () => {
    const m = calculateAcquisitionMetrics(
      baseAcquisition({ monthlyMarketingSpend: known(0), monthlySalesSpend: known(0), newCustomersAcquiredMonthly: known(0) })
    );
    expect(m.cac).toBe(0);
  });

  it("derives lead-to-customer conversion from leads and new customers", () => {
    const m = calculateAcquisitionMetrics(
      baseAcquisition({ monthlyLeads: known(300), newCustomersAcquiredMonthly: known(30) })
    );
    expect(m.leadToCustomerConversionPct).toBeCloseTo(10, 5);
  });

  it("prefers an explicit conversion rate over the derived one", () => {
    const m = calculateAcquisitionMetrics(
      baseAcquisition({ leadToCustomerConversionPct: known(15), monthlyLeads: known(300) })
    );
    expect(m.leadToCustomerConversionPct).toBe(15);
  });

  it("derives conversion from leads when the explicit conversion field is present but marked unknown", () => {
    // Regression: the wizard always populates optional Assumption fields with
    // a {value:0, quality:'unknown'} placeholder rather than leaving them
    // `undefined`, so a naive truthy check on the field would always win.
    const m = calculateAcquisitionMetrics(
      baseAcquisition({
        leadToCustomerConversionPct: unknownValue(0),
        monthlyLeads: known(400),
        newCustomersAcquiredMonthly: known(30),
      })
    );
    expect(m.leadToCustomerConversionPct).toBeCloseTo(7.5, 5);
  });

  it("returns null conversion when neither leads nor an explicit rate are known", () => {
    const m = calculateAcquisitionMetrics(
      baseAcquisition({ leadToCustomerConversionPct: unknownValue(0), monthlyLeads: unknownValue(0) })
    );
    expect(m.leadToCustomerConversionPct).toBeNull();
  });
});
