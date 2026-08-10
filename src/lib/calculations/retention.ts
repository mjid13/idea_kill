import type { RetentionAssumptions, RetentionMetrics } from "@/types";
import { pct, safeDiv, val } from "./helpers";

/**
 * Customer Lifetime Months = 1 / Monthly Churn Rate
 * Churn = 0 is handled explicitly: lifetime is treated as indefinite (null)
 * rather than dividing by zero.
 */
export function calculateRetentionMetrics(retention: RetentionAssumptions): RetentionMetrics {
  let monthlyChurnPct = val(retention.monthlyChurnPct);

  const monthlyChurnUnknown = retention.monthlyChurnPct.quality === "unknown";
  if (monthlyChurnUnknown && retention.annualChurnPct && retention.annualChurnPct.quality !== "unknown") {
    // Approximate a monthly rate from an annual churn rate when only that was provided.
    const annual = pct(val(retention.annualChurnPct));
    monthlyChurnPct = (1 - Math.pow(1 - annual, 1 / 12)) * 100;
  }

  const hasLifetimeOverride =
    retention.averageCustomerLifetimeMonths && retention.averageCustomerLifetimeMonths.quality !== "unknown";
  const customerLifetimeMonths = hasLifetimeOverride
    ? val(retention.averageCustomerLifetimeMonths)
    : safeDiv(1, pct(monthlyChurnPct));

  return {
    monthlyChurnPct,
    customerLifetimeMonths,
  };
}
