import type { ForecastMonth } from "@/types";
import { pct } from "./helpers";

export type { ForecastMonth };

export interface ForecastInputs {
  startingCustomers: number;
  newCustomersPerMonth: number;
  monthlyCustomerGrowthPct: number; // applied compounding to newCustomersPerMonth each month
  monthlyChurnPct: number;
  monthlyArpu: number;
  grossMarginPct: number; // 0-100, drives variable cost as a share of revenue
  monthlyOperatingExpenses: number;
  otherMonthlyIncome: number;
  startingCashBalance: number;
  isRecurringRevenue: boolean;
  months: number;
  /** % of MRR added each month from upsell/cross-sell to existing customers. Defaults to 0 (no effect). */
  monthlyExpansionRevenuePct?: number;
  /** % of MRR lost each month from downgrades among existing customers. Defaults to 0 (no effect). */
  monthlyContractionRevenuePct?: number;
  /**
   * Hybrid mix: revenue collected once per newly acquired customer (audit,
   * setup, implementation). Layered on top of the recurring stream rather than
   * replacing it, so a business can run both at once. Defaults to 0.
   */
  oneTimeRevenuePerNewCustomer?: number;
  /** Gross margin on that one-time revenue (0-100). Defaults to `grossMarginPct`. */
  oneTimeGrossMarginPct?: number;
  /**
   * Hybrid mix only: customer-level variable costs (direct, infrastructure,
   * support, other) charged per active customer per month *on top* of each
   * stream's delivery cost. In the single-price model these are already baked
   * into `grossMarginPct`, so it defaults to 0 and that path is unchanged.
   */
  customerLevelCostPerCustomerPerMonth?: number;
  /**
   * Hybrid mix only: payment processing as a % of all revenue, for the same
   * reason — the single-price `grossMarginPct` already contains it. Defaults to 0.
   */
  paymentProcessingPct?: number;
}

/**
 * Builds a month-by-month forecast. Kept as a pure function so it can drive
 * the 12/24/36-month projections, the scenario engine, and the sensitivity
 * sliders from a single implementation.
 */
export function generateForecast(inputs: ForecastInputs): ForecastMonth[] {
  const {
    startingCustomers,
    newCustomersPerMonth,
    monthlyCustomerGrowthPct,
    monthlyChurnPct,
    monthlyArpu,
    grossMarginPct,
    monthlyOperatingExpenses,
    otherMonthlyIncome,
    startingCashBalance,
    isRecurringRevenue,
    months,
    monthlyExpansionRevenuePct = 0,
    monthlyContractionRevenuePct = 0,
    oneTimeRevenuePerNewCustomer = 0,
    oneTimeGrossMarginPct = inputs.grossMarginPct,
    customerLevelCostPerCustomerPerMonth = 0,
    paymentProcessingPct = 0,
  } = inputs;

  const churnRate = pct(monthlyChurnPct);
  const growthRate = pct(monthlyCustomerGrowthPct);
  const marginRate = pct(grossMarginPct);
  const oneTimeMarginRate = pct(oneTimeGrossMarginPct);
  const expansionRate = pct(monthlyExpansionRevenuePct);
  const processingRate = pct(paymentProcessingPct);
  const contractionRate = pct(monthlyContractionRevenuePct);

  const result: ForecastMonth[] = [];
  let beginningCustomers = startingCustomers;
  let cashBalance = startingCashBalance;
  let currentNewCustomers = newCustomersPerMonth;
  // Dollar MRR carried forward from the retained customer base only. Expansion/
  // contraction compounds against this each month; customers acquired *this*
  // month join at their base ARPU and only start compounding from next month,
  // so a growing book isn't retroactively inflated by cohorts that haven't
  // experienced any upsell/downgrade yet.
  let retainedMrr = isRecurringRevenue ? startingCustomers * monthlyArpu : 0;

  for (let month = 1; month <= months; month++) {
    const newCustomers = Math.max(0, currentNewCustomers);
    const churnedCustomers = Math.max(0, Math.round(beginningCustomers * churnRate));
    const endingCustomers = Math.max(0, beginningCustomers + newCustomers - churnedCustomers);

    // Same churned share of the customer count is applied to the retained book's
    // dollars, so the zero-expansion/contraction case stays byte-identical to the
    // customer-count-driven MRR the pre-expansion behavior produced.
    const retentionFraction = beginningCustomers > 0 ? (beginningCustomers - churnedCustomers) / beginningCustomers : 1;
    const survivingRetainedMrr = retainedMrr * retentionFraction;
    const expansionRevenue = isRecurringRevenue ? survivingRetainedMrr * expansionRate : 0;
    const contractionRevenue = isRecurringRevenue ? survivingRetainedMrr * contractionRate : 0;
    const newMrr = newCustomers * monthlyArpu;

    const mrr = isRecurringRevenue ? survivingRetainedMrr + expansionRevenue - contractionRevenue + newMrr : 0;
    retainedMrr = mrr;

    const recurringRevenue = isRecurringRevenue ? mrr : newCustomers * monthlyArpu;
    // One-time revenue tracks acquisitions, not the installed base, and carries
    // its own (usually lower, services-shaped) margin.
    const oneTimeRevenue = newCustomers * oneTimeRevenuePerNewCustomer;
    const revenue = recurringRevenue + oneTimeRevenue;

    // Customer-level costs and payment processing sit outside the stream
    // delivery margins, exactly as `calculateHybridUnitEconomics` charges them.
    // Subtracting them here is what keeps the forecast's contribution per
    // customer identical to the one break-even divides by — without it a
    // project could show positive monthly cash flow while the break-even
    // section reported a negative contribution margin.
    const customerLevelCosts = endingCustomers * customerLevelCostPerCustomerPerMonth;
    const processingCosts = revenue * processingRate;
    const grossProfit =
      recurringRevenue * marginRate + oneTimeRevenue * oneTimeMarginRate - customerLevelCosts - processingCosts;
    const variableCosts = revenue - grossProfit;
    const netCashFlow = grossProfit - monthlyOperatingExpenses + otherMonthlyIncome;
    cashBalance += netCashFlow;

    result.push({
      month,
      beginningCustomers: Math.round(beginningCustomers),
      newCustomers: Math.round(newCustomers),
      churnedCustomers,
      endingCustomers: Math.round(endingCustomers),
      mrr,
      revenue,
      recurringRevenue,
      oneTimeRevenue,
      variableCosts,
      grossProfit,
      operatingExpenses: monthlyOperatingExpenses,
      netCashFlow,
      cashBalance,
      expansionRevenue,
      contractionRevenue,
    });

    beginningCustomers = endingCustomers;
    currentNewCustomers = currentNewCustomers * (1 + growthRate);
  }

  return result;
}

export function findBreakEvenMonth(forecast: ForecastMonth[]): number | null {
  const month = forecast.find((m) => m.netCashFlow >= 0);
  return month ? month.month : null;
}
