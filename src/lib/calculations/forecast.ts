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
  } = inputs;

  const churnRate = pct(monthlyChurnPct);
  const growthRate = pct(monthlyCustomerGrowthPct);
  const marginRate = pct(grossMarginPct);
  const expansionRate = pct(monthlyExpansionRevenuePct);
  const contractionRate = pct(monthlyContractionRevenuePct);

  const result: ForecastMonth[] = [];
  let beginningCustomers = startingCustomers;
  let cashBalance = startingCashBalance;
  let currentNewCustomers = newCustomersPerMonth;
  // Compounding overlay applied on top of customer-count-driven MRR to represent
  // upsell/downgrade revenue from existing customers. Stays at 1 (no effect) when
  // expansion/contraction are both 0, so the zero-input case is byte-identical to
  // the pre-expansion behavior.
  let expansionMultiplier = 1;

  for (let month = 1; month <= months; month++) {
    const newCustomers = Math.max(0, currentNewCustomers);
    const churnedCustomers = Math.max(0, Math.round(beginningCustomers * churnRate));
    const endingCustomers = Math.max(0, beginningCustomers + newCustomers - churnedCustomers);

    const baseMrr = isRecurringRevenue ? endingCustomers * monthlyArpu : 0;
    const expansionRevenue = baseMrr * expansionMultiplier * expansionRate;
    const contractionRevenue = baseMrr * expansionMultiplier * contractionRate;
    expansionMultiplier *= 1 + expansionRate - contractionRate;

    const mrr = isRecurringRevenue ? baseMrr * expansionMultiplier : 0;
    const revenue = isRecurringRevenue ? mrr : newCustomers * monthlyArpu;

    const grossProfit = revenue * marginRate;
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
      variableCosts,
      grossProfit,
      operatingExpenses: monthlyOperatingExpenses,
      netCashFlow,
      cashBalance,
      expansionRevenue: isRecurringRevenue ? expansionRevenue : 0,
      contractionRevenue: isRecurringRevenue ? contractionRevenue : 0,
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
