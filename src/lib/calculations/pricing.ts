import type { PricingAssumptions, RevenueMetrics } from "@/types";
import { isRecurring, normalizeToMonthlyArpu, val } from "./helpers";

/**
 * MRR = Monthly Customers x Monthly ARPU
 * ARR = MRR x 12
 *
 * Annual subscriptions are normalized to a monthly ARPU before computing MRR
 * so that mixed billing periods stay comparable. One-time / usage-based
 * products do not have a stable MRR concept; monthlyRevenue instead reflects
 * a period-appropriate estimate using current customer count as a proxy.
 */
export function calculateRevenueMetrics(pricing: PricingAssumptions): RevenueMetrics {
  const price = val(pricing.productPrice);
  const currentCustomers = val(pricing.currentCustomers);

  const monthlyArpu = normalizeToMonthlyArpu(price, pricing.billingPeriod);

  if (!isRecurring(pricing.billingPeriod)) {
    // One-time purchase: revenue is transactional, not recurring.
    const monthlyRevenue = price * currentCustomers;
    return {
      monthlyArpu: price,
      mrr: 0,
      arr: 0,
      monthlyRevenue,
      annualRevenue: monthlyRevenue * 12,
    };
  }

  const mrr = monthlyArpu * currentCustomers;
  const arr = mrr * 12;

  return {
    monthlyArpu,
    mrr,
    arr,
    monthlyRevenue: mrr,
    annualRevenue: arr,
  };
}
