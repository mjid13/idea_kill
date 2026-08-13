import type { CalculatedMetrics, Project } from "@/types";
import { isRecurring, val } from "./helpers";
import { generateForecast, type ForecastInputs, type ForecastMonth } from "./forecast";

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

  return {
    startingCustomers: val(project.pricing.currentCustomers),
    newCustomersPerMonth: val(project.acquisition.newCustomersAcquiredMonthly),
    monthlyCustomerGrowthPct: val(project.pricing.expectedMonthlyCustomerGrowthPct) * growthMultiplier,
    monthlyChurnPct: Math.max(0, metrics.retention.monthlyChurnPct * churnMultiplier),
    monthlyArpu: metrics.revenue.monthlyArpu * priceMultiplier,
    grossMarginPct: metrics.unitEconomics.grossMarginPct,
    monthlyOperatingExpenses: metrics.operating.monthlyOperatingCost,
    otherMonthlyIncome: val(project.funding.otherMonthlyIncome),
    startingCashBalance: val(project.funding.availableCash) + val(project.funding.initialInvestment),
    isRecurringRevenue: isRecurring(project.pricing.billingPeriod),
    months,
    monthlyExpansionRevenuePct: val(project.retention.monthlyExpansionRevenuePct) * expansionMultiplier,
    monthlyContractionRevenuePct: val(project.retention.monthlyContractionRevenuePct) * contractionMultiplier,
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
