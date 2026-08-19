import type { CalculatedMetrics, Project } from "@/types";
import { isRecurring, val } from "./helpers";
import { generateForecast, type ForecastInputs, type ForecastMonth } from "./forecast";
import { customerLevelMonthlyCost } from "./unitEconomics";

export interface ForecastOverrides {
  monthlyCustomerGrowthPctDelta?: number; // percentage-point delta applied to base growth
  cacMultiplier?: number; // reserved for scenario engine symmetry; CAC doesn't feed the forecast directly
  churnMultiplier?: number;
  priceMultiplier?: number;
  growthMultiplier?: number;
  expansionMultiplier?: number;
  contractionMultiplier?: number;
}

export function buildForecastInputs(
  project: Project,
  metrics: CalculatedMetrics,
  months: number,
  overrides: ForecastOverrides = {}
): ForecastInputs {
  const churnMultiplier = overrides.churnMultiplier ?? 1;
  const growthMultiplier = overrides.growthMultiplier ?? 1;
  const priceMultiplier = overrides.priceMultiplier ?? 1;
  const expansionMultiplier = overrides.expansionMultiplier ?? 1;
  const contractionMultiplier = overrides.contractionMultiplier ?? 1;

  const mix = metrics.revenueMix;

  return {
    startingCustomers: val(project.pricing.currentCustomers),
    newCustomersPerMonth: val(project.acquisition.newCustomersAcquiredMonthly),
    monthlyCustomerGrowthPct: val(project.pricing.expectedMonthlyCustomerGrowthPct) * growthMultiplier,
    monthlyChurnPct: Math.max(0, metrics.retention.monthlyChurnPct * churnMultiplier),
    // With a mix, ARPU is strictly the recurring half — the one-time half is
    // passed separately below, and feeding it in twice would double-count a
    // project whose streams are all one-time.
    monthlyArpu: (mix ? mix.recurringArpu : metrics.revenue.monthlyArpu) * priceMultiplier,
    // A hybrid mix carries a different margin on each half of the business, so
    // the forecast gets the recurring margin here and the one-time margin below
    // instead of one blended rate applied to both.
    grossMarginPct: mix ? mix.recurringGrossMarginPct : metrics.unitEconomics.grossMarginPct,
    monthlyOperatingExpenses: metrics.operating.monthlyOperatingCost,
    otherMonthlyIncome: val(project.funding.otherMonthlyIncome),
    startingCashBalance: val(project.funding.availableCash) + val(project.funding.initialInvestment),
    // With a mix, whether revenue recurs is a property of the streams, not of
    // the single `pricing.billingPeriod` dropdown.
    isRecurringRevenue: mix ? mix.recurringArpu > 0 : isRecurring(project.pricing.billingPeriod),
    months,
    oneTimeRevenuePerNewCustomer: mix ? mix.oneTimeRevenuePerNewCustomer * priceMultiplier : 0,
    oneTimeGrossMarginPct: mix ? mix.oneTimeGrossMarginPct : undefined,
    monthlyExpansionRevenuePct: val(project.retention.monthlyExpansionRevenuePct) * expansionMultiplier,
    monthlyContractionRevenuePct: val(project.retention.monthlyContractionRevenuePct) * contractionMultiplier,
    // Only the mix path needs these: with a mix, `grossMarginPct` above is the
    // streams' delivery margin alone, so the customer-level cost lines have to
    // be charged separately or the forecast would disagree with the break-even
    // and LTV figures, which do subtract them. In the single-price path
    // `unitEconomics.grossMarginPct` already includes both, so they stay 0.
    customerLevelCostPerCustomerPerMonth: mix ? customerLevelMonthlyCost(project.unitEconomics) : 0,
    paymentProcessingPct: mix ? val(project.unitEconomics.paymentProcessingPct) : 0,
  };
}

export function forecastProject(
  project: Project,
  metrics: CalculatedMetrics,
  months: number,
  overrides: ForecastOverrides = {}
): ForecastMonth[] {
  return generateForecast(buildForecastInputs(project, metrics, months, overrides));
}
