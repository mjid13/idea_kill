import type { MarketplaceAssumptions, MarketplaceMetrics, PricingAssumptions } from "@/types";
import { pct, safeDivOrZero, val } from "./helpers";

/**
 * GMV/take-rate economics for marketplace-model projects. Marketplaces earn a
 * take rate on gross transaction volume, not a per-customer subscription
 * price — treating them like SaaS (flat revenue-per-customer) misprices the
 * business. Returns null when there's no marketplace data to compute from
 * (slice absent or every field still unknown).
 */
export function calculateMarketplaceMetrics(
  marketplace: MarketplaceAssumptions | undefined,
  pricing: PricingAssumptions
): MarketplaceMetrics | null {
  if (!marketplace) return null;

  const hasData =
    marketplace.averageOrderValue.quality !== "unknown" ||
    marketplace.takeRatePct.quality !== "unknown" ||
    marketplace.transactionsPerCustomerPerMonth.quality !== "unknown";
  if (!hasData) return null;

  const currentCustomers = val(pricing.currentCustomers);
  const averageOrderValue = val(marketplace.averageOrderValue);
  const transactionsPerCustomerPerMonth = val(marketplace.transactionsPerCustomerPerMonth);
  const takeRatePct = val(marketplace.takeRatePct);

  const gmv = currentCustomers * transactionsPerCustomerPerMonth * averageOrderValue;
  const takeRateRevenue = gmv * pct(takeRatePct);
  const effectiveArpu = safeDivOrZero(takeRateRevenue, currentCustomers);

  return { gmv, takeRateRevenue, effectiveArpu, takeRatePct };
}
