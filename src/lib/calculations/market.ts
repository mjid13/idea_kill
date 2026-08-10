import type { MarketAssumptions, MarketMetrics } from "@/types";
import { pct, safeDiv, val } from "./helpers";

/**
 * TAM = Total Potential Customers x Average Annual Customer Spend
 * SAM = TAM x Addressable Market %
 * SOM = SAM x Obtainable Market %
 * Required Market Penetration = Target Customers / Addressable Customers
 *
 * Direct TAM/SAM/SOM overrides (section 5) take precedence over the derived
 * values when provided, letting a user skip the bottom-up build if they
 * already know their market sizing.
 */
export function calculateMarketMetrics(market: MarketAssumptions): MarketMetrics {
  const totalPotentialCustomers = val(market.totalPotentialCustomers);
  const avgSpend = val(market.averageAnnualCustomerSpend);
  const addressablePct = val(market.addressableMarketPct);
  const obtainablePct = val(market.obtainableMarketPct);
  const targetCustomers = val(market.targetCustomers);

  const tam = market.tamOverride ?? totalPotentialCustomers * avgSpend;
  const sam = market.samOverride ?? tam * pct(addressablePct);
  const som = market.somOverride ?? sam * pct(obtainablePct);

  const addressableCustomers = totalPotentialCustomers * pct(addressablePct);
  const requiredMarketPenetrationPct = (safeDiv(targetCustomers, addressableCustomers) ?? 0) * 100;

  return {
    tam: Math.max(0, tam),
    sam: Math.max(0, sam),
    som: Math.max(0, som),
    requiredMarketPenetrationPct: Math.max(0, requiredMarketPenetrationPct),
  };
}
