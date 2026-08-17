import type { CalculatedMetrics, EfficiencyMetrics, ForecastMonth, Project } from "@/types";
import { isRecurring, safeDiv, val } from "./helpers";

const NULL_EFFICIENCY_METRICS: EfficiencyMetrics = {
  annualGrowthPct: null,
  profitMarginPct: null,
  ruleOf40Score: null,
  burnMultiple: null,
  magicNumber: null,
  quickRatio: null,
};

/**
 * SaaS efficiency ratios (Rule of 40, Burn Multiple, Magic Number, Quick
 * Ratio), derived from a projected 12-month forecast rather than trailing
 * actuals — this app has no historical-actuals concept, only projections.
 * Only meaningful for recurring-revenue models; returns all-null otherwise.
 *
 * Kept outside CalculatedMetrics: the forecast itself takes CalculatedMetrics
 * as an input (buildForecastInputs), so computing this inside calculateMetrics
 * would be circular.
 */
export function calculateEfficiencyMetrics(
  project: Project,
  metrics: CalculatedMetrics,
  forecast: ForecastMonth[]
): EfficiencyMetrics {
  // These ratios describe a recurring-revenue business. A hybrid mix qualifies
  // on its recurring streams, whatever the single `pricing.billingPeriod` says.
  const hasRecurringRevenue = metrics.revenueMix
    ? metrics.revenueMix.recurringArpu > 0
    : isRecurring(project.pricing.billingPeriod);
  if (!hasRecurringRevenue || forecast.length < 12) {
    return NULL_EFFICIENCY_METRICS;
  }

  const twelveMonthsOut = forecast[11];
  const trailingWindow = forecast.slice(0, 12);

  const startingMrr = metrics.revenue.mrr;
  const endingMrr = twelveMonthsOut.mrr;

  const annualGrowthPctRaw = safeDiv(endingMrr - startingMrr, startingMrr);
  const annualGrowthPct = annualGrowthPctRaw === null ? null : annualGrowthPctRaw * 100;

  const totalRevenue = trailingWindow.reduce((sum, m) => sum + m.revenue, 0);
  const totalNetCashFlow = trailingWindow.reduce((sum, m) => sum + m.netCashFlow, 0);
  const profitMarginPctRaw = safeDiv(totalNetCashFlow, totalRevenue);
  const profitMarginPct = profitMarginPctRaw === null ? null : profitMarginPctRaw * 100;

  const ruleOf40Score = annualGrowthPct === null || profitMarginPct === null ? null : annualGrowthPct + profitMarginPct;

  const netNewARR = (endingMrr - startingMrr) * 12;

  const totalNetBurn = trailingWindow.reduce((sum, m) => sum + Math.max(0, -m.netCashFlow), 0);
  const burnMultiple = netNewARR > 0 ? safeDiv(totalNetBurn, netNewARR) : null;

  const annualizedSalesAndMarketingSpend = (val(project.costs.marketing) + val(project.costs.sales)) * 12;
  const magicNumber = safeDiv(netNewARR, annualizedSalesAndMarketingSpend);

  const monthlyArpu = metrics.revenue.monthlyArpu;
  const grossNewMrr = trailingWindow.reduce((sum, m) => sum + m.newCustomers * monthlyArpu, 0);
  const churnedMrr = trailingWindow.reduce((sum, m) => sum + m.churnedCustomers * monthlyArpu, 0);
  const totalExpansion = trailingWindow.reduce((sum, m) => sum + m.expansionRevenue, 0);
  const totalContraction = trailingWindow.reduce((sum, m) => sum + m.contractionRevenue, 0);
  const quickRatio = safeDiv(grossNewMrr + totalExpansion, churnedMrr + totalContraction);

  return { annualGrowthPct, profitMarginPct, ruleOf40Score, burnMultiple, magicNumber, quickRatio };
}
