import type {
  MarketAssumptions,
  MarketFunnel,
  MarketFunnelMetrics,
  MarketFunnelStageMetrics,
  MarketMetrics,
  MarketSizingMethod,
} from "@/types";
import { pct, safeDiv, val } from "./helpers";

/**
 * Three ways to size the market, selected by `market.sizingMethod`:
 *
 * - "simple": TAM = Total Potential Customers x Average Annual Customer Spend,
 *   SAM = TAM x Addressable %, SOM = SAM x Obtainable %. Fast, but two opaque
 *   percentages carry the whole argument.
 *
 * - "funnel": a bottom-up qualification funnel. A starting universe of accounts
 *   is narrowed by ordered filters (sector, company size, digital maturity,
 *   workflow fit, budget, reachability) and TAM/SAM/SOM are read off three
 *   populations in that cascade rather than guessed as percentages.
 *
 * - "direct": the TAM/SAM/SOM overrides are used as entered.
 *
 * Required Market Penetration = Target Customers / Addressable Customers in
 * every method — only the definition of "addressable customers" changes.
 */
export function calculateMarketMetrics(market: MarketAssumptions): MarketMetrics {
  const method = resolveSizingMethod(market);
  const avgSpend = val(market.averageAnnualCustomerSpend);
  const targetCustomers = val(market.targetCustomers);

  const funnel = method === "funnel" && market.funnel ? calculateFunnel(market.funnel, avgSpend) : null;

  const totalPotentialCustomers = val(market.totalPotentialCustomers);
  const addressablePct = val(market.addressableMarketPct);
  const obtainablePct = val(market.obtainableMarketPct);

  const derivedTam = funnel ? funnel.universeAccounts * avgSpend : totalPotentialCustomers * avgSpend;
  const derivedSam = funnel ? funnel.addressableAccounts * avgSpend : derivedTam * pct(addressablePct);
  const derivedSom = funnel ? funnel.obtainableAccounts * avgSpend : derivedSam * pct(obtainablePct);

  // Overrides are deliberately scoped to the "direct" method: a founder who
  // typed overrides once and then switched back to a derived method should see
  // the derived numbers, not the stale overrides. A partially filled direct
  // entry falls through to the simple chain for the levels left blank.
  let tam = derivedTam;
  let sam = derivedSam;
  let som = derivedSom;
  if (method === "direct") {
    tam = market.tamOverride ?? derivedTam;
    sam = market.samOverride ?? tam * pct(addressablePct);
    som = market.somOverride ?? sam * pct(obtainablePct);
  }

  // In "direct" mode the population behind SAM isn't stated, so fall back to
  // the simple model's addressable-customer count for the penetration ratio.
  const addressableCustomers = funnel
    ? funnel.addressableAccounts
    : totalPotentialCustomers * pct(addressablePct);
  const requiredMarketPenetrationPct = (safeDiv(targetCustomers, addressableCustomers) ?? 0) * 100;

  return {
    tam: Math.max(0, tam),
    sam: Math.max(0, sam),
    som: Math.max(0, som),
    requiredMarketPenetrationPct: Math.max(0, requiredMarketPenetrationPct),
    method,
    addressableCustomers: Math.max(0, addressableCustomers),
    funnel,
  };
}

/**
 * Projects saved before the funnel existed have no `sizingMethod`. Those that
 * carry a TAM/SAM/SOM override were using direct entry, so they keep behaving
 * that way; everything else is the simple model.
 */
export function resolveSizingMethod(market: MarketAssumptions): MarketSizingMethod {
  if (market.sizingMethod) return market.sizingMethod;
  const hasOverride =
    market.tamOverride !== undefined || market.samOverride !== undefined || market.somOverride !== undefined;
  return hasOverride ? "direct" : "simple";
}

/**
 * Walks the funnel top to bottom. Each stage is either an absolute account
 * count or a survival percentage of the stage above it. Counts are never
 * clamped to the previous stage — an expanding stage is surfaced via
 * `isExpanding` so the UI can flag the data error instead of hiding it.
 */
export function calculateFunnel(funnel: MarketFunnel, annualSpendPerAccount: number): MarketFunnelMetrics {
  const universeAccounts = Math.max(0, val(funnel.baseCount));

  const stages: MarketFunnelStageMetrics[] = [
    {
      id: BASE_STAGE_ID,
      label: funnel.baseLabel || "Total universe",
      accounts: universeAccounts,
      survivalPct: 100,
      shareOfUniversePct: universeAccounts > 0 ? 100 : 0,
      annualValue: universeAccounts * annualSpendPerAccount,
      isExpanding: false,
    },
  ];

  let previous = universeAccounts;
  for (const stage of funnel.stages) {
    const raw = val(stage.value);
    const accounts = Math.max(0, stage.mode === "percent" ? previous * pct(raw) : raw);
    stages.push({
      id: stage.id,
      label: stage.label,
      accounts,
      survivalPct: (safeDiv(accounts, previous) ?? 0) * 100,
      shareOfUniversePct: (safeDiv(accounts, universeAccounts) ?? 0) * 100,
      annualValue: accounts * annualSpendPerAccount,
      isExpanding: accounts > previous,
    });
    previous = accounts;
  }

  const somStage = pickStage(stages, funnel.somStageId, stages.length - 1);
  // SAM sits one filter above SOM by default: the population we can serve,
  // before the last qualification cut that produces the accounts we'd chase.
  const samDefaultIndex = Math.max(0, stages.indexOf(somStage) - 1);
  const samStage = pickStage(stages, funnel.samStageId, samDefaultIndex);

  const qualifiedAccounts = somStage.accounts;
  const winRate = funnel.winRatePct.quality === "unknown" ? 100 : val(funnel.winRatePct);
  const obtainableAccounts = qualifiedAccounts * pct(Math.max(0, winRate));

  return {
    stages,
    universeAccounts,
    addressableAccounts: samStage.accounts,
    qualifiedAccounts,
    obtainableAccounts,
    overallQualificationPct: (safeDiv(qualifiedAccounts, universeAccounts) ?? 0) * 100,
  };
}

/** Synthetic id for the starting universe, which is not itself a filter stage. */
export const BASE_STAGE_ID = "__base__";

function pickStage(
  stages: MarketFunnelStageMetrics[],
  id: string | undefined,
  fallbackIndex: number
): MarketFunnelStageMetrics {
  const found = id ? stages.find((s) => s.id === id) : undefined;
  return found ?? stages[Math.min(Math.max(fallbackIndex, 0), stages.length - 1)];
}
