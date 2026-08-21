import type { Project } from "@/types";
import { calculateMetrics } from "./metrics";
import { calculateScoreBreakdown } from "@/lib/scoring";

export interface SensitivityMultipliers {
  price: number;
  cac: number;
  churn: number;
  growth: number;
}

export const DEFAULT_MULTIPLIERS: SensitivityMultipliers = { price: 1, cac: 1, churn: 1, growth: 1 };

/**
 * Applies price/CAC/churn/growth multipliers to a project's assumptions
 * without mutating the original. CAC is not a direct input (it's derived
 * from spend / new customers), so a CAC multiplier scales acquisition spend
 * proportionally, which scales CAC the same way while holding customer
 * count constant.
 *
 * The price lever also has to reach whichever pricing model is actually
 * operative — `calculateMetrics` gives revenue streams and marketplace GMV
 * priority over the flat `pricing.productPrice` whenever either carries data
 * (see revenueStreams.ts/marketplace.ts), so leaving those untouched would
 * make "Pricing" a no-op for any hybrid or marketplace project.
 */
export function applyMultipliers(project: Project, multipliers: SensitivityMultipliers): Project {
  return {
    ...project,
    pricing: {
      ...project.pricing,
      productPrice: { ...project.pricing.productPrice, value: project.pricing.productPrice.value * multipliers.price },
      expectedMonthlyCustomerGrowthPct: {
        ...project.pricing.expectedMonthlyCustomerGrowthPct,
        value: project.pricing.expectedMonthlyCustomerGrowthPct.value * multipliers.growth,
      },
    },
    acquisition: {
      ...project.acquisition,
      monthlyMarketingSpend: { ...project.acquisition.monthlyMarketingSpend, value: project.acquisition.monthlyMarketingSpend.value * multipliers.cac },
      monthlySalesSpend: { ...project.acquisition.monthlySalesSpend, value: project.acquisition.monthlySalesSpend.value * multipliers.cac },
    },
    retention: {
      ...project.retention,
      monthlyChurnPct: { ...project.retention.monthlyChurnPct, value: project.retention.monthlyChurnPct.value * multipliers.churn },
    },
    unitEconomics: {
      ...project.unitEconomics,
      revenuePerCustomer: { ...project.unitEconomics.revenuePerCustomer, value: project.unitEconomics.revenuePerCustomer.value * multipliers.price },
    },
    revenueStreams: project.revenueStreams?.map((stream) => ({
      ...stream,
      price: { ...stream.price, value: stream.price.value * multipliers.price },
    })),
    marketplace: project.marketplace && {
      ...project.marketplace,
      averageOrderValue: { ...project.marketplace.averageOrderValue, value: project.marketplace.averageOrderValue.value * multipliers.price },
    },
  };
}

export interface SensitivityRankingItem {
  key: keyof SensitivityMultipliers;
  label: string;
  impact: number; // spread in overall score points between the -50% and +50% cases
}

const LEVER_LABELS: Record<keyof SensitivityMultipliers, string> = {
  churn: "Churn",
  cac: "Customer acquisition cost",
  price: "Pricing",
  growth: "Customer growth rate",
};

/** Ranks assumptions by how much they move the overall viability score when flexed ±50% (spec section 22). */
export function calculateSensitivityRanking(project: Project): SensitivityRankingItem[] {
  const levers: Array<keyof SensitivityMultipliers> = ["churn", "cac", "price", "growth"];

  return levers
    .map((key) => {
      const low = applyMultipliers(project, { ...DEFAULT_MULTIPLIERS, [key]: 0.5 });
      const high = applyMultipliers(project, { ...DEFAULT_MULTIPLIERS, [key]: 1.5 });

      const lowScore = calculateScoreBreakdown(low, calculateMetrics(low)).overall;
      const highScore = calculateScoreBreakdown(high, calculateMetrics(high)).overall;

      return { key, label: LEVER_LABELS[key], impact: Math.abs(highScore - lowScore) };
    })
    .sort((a, b) => b.impact - a.impact);
}
