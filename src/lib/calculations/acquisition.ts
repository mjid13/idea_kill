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

  const cac = safeDiv(marketing + sales, newCustomers) ?? 0;

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
