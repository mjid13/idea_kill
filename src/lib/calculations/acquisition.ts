import type { AcquisitionAssumptions, AcquisitionMetrics } from "@/types";
import { safeDiv, val } from "./helpers";

/**
 * CAC = (Marketing Spend + Sales Spend) / New Customers Acquired
 * Lead-to-customer conversion is derived automatically when leads and
 * acquired customers are both entered.
 */
export function calculateAcquisitionMetrics(acquisition: AcquisitionAssumptions): AcquisitionMetrics {
  const marketing = val(acquisition.monthlyMarketingSpend);
  const sales = val(acquisition.monthlySalesSpend);
  const newCustomers = val(acquisition.newCustomersAcquiredMonthly);

  const spend = marketing + sales;
  // If nothing has been entered yet (no spend, no customers), 0 is the least
  // misleading default. But if spend was made and zero customers resulted,
  // CAC is unknown/effectively unbounded — leaving it null (rather than 0)
  // stops downstream payback/LTV:CAC calculations from reading as "instant".
  const cac = safeDiv(spend, newCustomers) ?? (spend === 0 ? 0 : null);

  let leadToCustomerConversionPct: number | null = null;
  const hasExplicitConversion =
    acquisition.leadToCustomerConversionPct && acquisition.leadToCustomerConversionPct.quality !== "unknown";
  const hasLeads = acquisition.monthlyLeads && acquisition.monthlyLeads.quality !== "unknown";
  if (hasExplicitConversion) {
    leadToCustomerConversionPct = val(acquisition.leadToCustomerConversionPct);
  } else if (hasLeads) {
    const leads = val(acquisition.monthlyLeads);
    const converted = safeDiv(newCustomers, leads);
    leadToCustomerConversionPct = converted === null ? null : converted * 100;
  }

  return { cac, leadToCustomerConversionPct };
}
