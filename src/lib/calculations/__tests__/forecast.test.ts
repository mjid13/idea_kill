import { describe, expect, it } from "vitest";
import { generateForecast, findBreakEvenMonth, type ForecastInputs } from "../forecast";

function baseInputs(overrides: Partial<ForecastInputs> = {}): ForecastInputs {
  return {
    startingCustomers: 50,
    newCustomersPerMonth: 30,
    monthlyCustomerGrowthPct: 0,
    monthlyChurnPct: 3,
    monthlyArpu: 50,
    grossMarginPct: 80,
    monthlyOperatingExpenses: 12000,
    otherMonthlyIncome: 0,
    startingCashBalance: 100000,
    isRecurringRevenue: true,
    months: 12,
    ...overrides,
  };
}

describe("generateForecast", () => {
  it("produces the requested number of months", () => {
    const forecast = generateForecast(baseInputs({ months: 24 }));
    expect(forecast).toHaveLength(24);
  });

  it("never produces NaN or Infinity values", () => {
    const forecast = generateForecast(baseInputs({ monthlyChurnPct: 0, newCustomersPerMonth: 0 }));
    for (const m of forecast) {
      for (const v of Object.values(m)) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it("grows customers month over month when new customers exceed churn", () => {
    const forecast = generateForecast(baseInputs());
    expect(forecast[1].beginningCustomers).toBe(forecast[0].endingCustomers);
    expect(forecast[11].endingCustomers).toBeGreaterThan(forecast[0].endingCustomers);
  });

  it("handles zero customers and zero revenue without crashing", () => {
    const forecast = generateForecast(
      baseInputs({ startingCustomers: 0, newCustomersPerMonth: 0, monthlyArpu: 0 })
    );
    expect(forecast[0].revenue).toBe(0);
    expect(forecast[0].endingCustomers).toBe(0);
  });

  it("compounds new-customer growth using the monthly growth rate", () => {
    const forecast = generateForecast(baseInputs({ monthlyCustomerGrowthPct: 10, monthlyChurnPct: 0 }));
    expect(forecast[1].newCustomers).toBeGreaterThan(forecast[0].newCustomers);
  });

  it("finds the first break-even month where cash flow turns non-negative", () => {
    const forecast = generateForecast(
      baseInputs({ startingCustomers: 1000, monthlyOperatingExpenses: 1000 })
    );
    const breakEvenMonth = findBreakEvenMonth(forecast);
    expect(breakEvenMonth).toBe(1);
  });

  it("returns null break-even month when the business never turns cash-flow positive", () => {
    const forecast = generateForecast(
      baseInputs({ startingCustomers: 0, newCustomersPerMonth: 0, monthlyOperatingExpenses: 5000 })
    );
    expect(findBreakEvenMonth(forecast)).toBeNull();
  });

  it("is byte-identical to the pre-expansion behavior when expansion/contraction are omitted", () => {
    const withDefaults = generateForecast(baseInputs());
    const withExplicitZeros = generateForecast(
      baseInputs({ monthlyExpansionRevenuePct: 0, monthlyContractionRevenuePct: 0 })
    );
    expect(withExplicitZeros).toEqual(withDefaults);
    // Every month's expansion/contraction dollar amounts must be exactly zero too.
    for (const m of withDefaults) {
      expect(m.expansionRevenue).toBe(0);
      expect(m.contractionRevenue).toBe(0);
    }
  });

  it("grows MRR faster than the customer-count-only baseline when expansion revenue is applied", () => {
    const baseline = generateForecast(baseInputs());
    const withExpansion = generateForecast(baseInputs({ monthlyExpansionRevenuePct: 5 }));
    expect(withExpansion[11].mrr).toBeGreaterThan(baseline[11].mrr);
    expect(withExpansion[11].expansionRevenue).toBeGreaterThan(0);
  });

  it("shrinks MRR relative to the baseline when contraction revenue is applied", () => {
    const baseline = generateForecast(baseInputs());
    const withContraction = generateForecast(baseInputs({ monthlyContractionRevenuePct: 5 }));
    expect(withContraction[11].mrr).toBeLessThan(baseline[11].mrr);
    expect(withContraction[11].contractionRevenue).toBeGreaterThan(0);
  });

  it("does not apply expansion to customers acquired in the same month they join", () => {
    // Reference values: 10 new customers/mo at $100 ARPU, no churn, 5%/mo expansion.
    // Each cohort should only start compounding the month *after* it joins — a
    // customer acquired this month must be booked at the flat $100 base rate, not
    // inflated by the multiplier the pre-existing book has already accumulated.
    const forecast = generateForecast(
      baseInputs({
        startingCustomers: 0,
        newCustomersPerMonth: 10,
        monthlyChurnPct: 0,
        monthlyArpu: 100,
        monthlyExpansionRevenuePct: 5,
        months: 6,
      })
    );
    const expectedMrr = [1000, 2050, 3152.5, 4310.125, 5525.63125, 6801.912812500001];
    forecast.forEach((m, i) => expect(m.mrr).toBeCloseTo(expectedMrr[i], 6));
  });

  it("never applies expansion/contraction revenue to non-recurring revenue", () => {
    const forecast = generateForecast(
      baseInputs({ isRecurringRevenue: false, monthlyExpansionRevenuePct: 10, monthlyContractionRevenuePct: 10 })
    );
    for (const m of forecast) {
      expect(m.expansionRevenue).toBe(0);
      expect(m.contractionRevenue).toBe(0);
      expect(m.mrr).toBe(0);
    }
  });
});

/**
 * The mix path passes the customer-level cost lines in separately, because
 * `grossMarginPct` there is the streams' delivery margin alone. The
 * single-price path leaves them at 0 — its margin already contains them.
 */
describe("generateForecast — customer-level costs", () => {
  it("leaves the single-price path untouched when the new inputs are omitted", () => {
    const withDefaults = generateForecast(baseInputs());
    const withExplicitZeros = generateForecast(
      baseInputs({ customerLevelCostPerCustomerPerMonth: 0, paymentProcessingPct: 0 })
    );
    expect(withExplicitZeros).toEqual(withDefaults);
  });

  it("charges customer-level costs against every active customer", () => {
    const base = generateForecast(baseInputs())[0];
    const [withCosts] = generateForecast(baseInputs({ customerLevelCostPerCustomerPerMonth: 4 }));

    expect(withCosts.revenue).toBe(base.revenue);
    expect(withCosts.grossProfit).toBeCloseTo(base.grossProfit - withCosts.endingCustomers * 4, 6);
    // Whatever leaves gross profit has to show up as a variable cost.
    expect(withCosts.variableCosts).toBeCloseTo(base.variableCosts + withCosts.endingCustomers * 4, 6);
    expect(withCosts.netCashFlow).toBeCloseTo(base.netCashFlow - withCosts.endingCustomers * 4, 6);
  });

  it("charges payment processing against all revenue, one-time included", () => {
    const inputs = baseInputs({ oneTimeRevenuePerNewCustomer: 1000, oneTimeGrossMarginPct: 50 });
    const base = generateForecast(inputs)[0];
    const [withProcessing] = generateForecast({ ...inputs, paymentProcessingPct: 3 });

    expect(withProcessing.grossProfit).toBeCloseTo(base.grossProfit - base.revenue * 0.03, 6);
  });
});
