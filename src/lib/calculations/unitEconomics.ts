import type { UnitEconomicsAssumptions, UnitEconomicsMetrics } from "@/types";
import { pct, safeDiv, val } from "./helpers";

/**
 * Gross Profit Per Customer = Revenue Per Customer - Variable Costs Per Customer
 * Gross Margin = Gross Profit / Revenue
 * LTV = Monthly ARPU x Gross Margin % / Monthly Churn Rate (contribution-margin based, not raw revenue)
 * LTV:CAC = LTV / CAC
 * CAC Payback Period = CAC / Monthly Gross Profit Per Customer
 */
export function calculateUnitEconomicsMetrics(
  unitEconomics: UnitEconomicsAssumptions,
  monthlyArpu: number,
  cac: number,
  monthlyChurnPct: number
): UnitEconomicsMetrics {
  const revenuePerCustomer = val(unitEconomics.revenuePerCustomer);
  const directCost = val(unitEconomics.directCostPerCustomer);
  const paymentProcessingCost = revenuePerCustomer * pct(val(unitEconomics.paymentProcessingPct));
  const infrastructure = val(unitEconomics.infrastructureCostPerCustomer);
  const support = val(unitEconomics.supportCostPerCustomer);
  const other = val(unitEconomics.otherVariableCostPerCustomer);

  const variableCostPerCustomer = directCost + paymentProcessingCost + infrastructure + support + other;
  const grossProfitPerCustomer = revenuePerCustomer - variableCostPerCustomer;
  const grossMarginPct = (safeDiv(grossProfitPerCustomer, revenuePerCustomer) ?? 0) * 100;

  const churnRate = pct(monthlyChurnPct);
  const ltv = churnRate > 0 ? (monthlyArpu * pct(grossMarginPct)) / churnRate : monthlyArpu * pct(grossMarginPct) * 1000;
  // When churn is effectively zero, lifetime is indefinite; cap LTV at a large-but-finite
  // multiple (1000 months ~ 83 years) instead of Infinity so the UI never breaks.

  const ltvToCacRatio = safeDiv(ltv, cac);

  const monthlyGrossProfitPerCustomer = grossProfitPerCustomer; // per-customer monthly figure
  const cacPaybackMonths = safeDiv(cac, monthlyGrossProfitPerCustomer);

  return {
    variableCostPerCustomer,
    grossProfitPerCustomer,
    grossMarginPct,
    ltv,
    ltvToCacRatio,
    cacPaybackMonths: cacPaybackMonths !== null && cacPaybackMonths < 0 ? null : cacPaybackMonths,
  };
}
