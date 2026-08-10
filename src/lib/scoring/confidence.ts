import type { Assumption, Project } from "@/types";
import { val } from "@/lib/calculations/helpers";
import { ratingToScore, weightedAverage } from "./interpolate";

const QUALITY_WEIGHT: Record<Assumption<number>["quality"], number> = {
  known: 100,
  estimated: 60,
  unknown: 10,
};

/** The core assumptions that materially drive the calculated metrics and score. */
function coreAssumptions(project: Project): Array<Assumption<number> | undefined> {
  return [
    project.market.totalPotentialCustomers,
    project.market.averageAnnualCustomerSpend,
    project.market.addressableMarketPct,
    project.market.obtainableMarketPct,
    project.pricing.productPrice,
    project.pricing.currentCustomers,
    project.pricing.expectedMonthlyCustomerGrowthPct,
    project.acquisition.monthlyMarketingSpend,
    project.acquisition.monthlySalesSpend,
    project.acquisition.newCustomersAcquiredMonthly,
    project.retention.monthlyChurnPct,
    project.unitEconomics.revenuePerCustomer,
    project.unitEconomics.directCostPerCustomer,
    project.costs.founderSalaries,
    project.costs.employeeSalaries,
    project.costs.marketing,
    project.costs.sales,
    project.funding.availableCash,
  ];
}

/**
 * Confidence is a separate axis from the viability score: it measures how
 * much real evidence backs the assumptions, not how good the economics are.
 * A strong-looking score built on unknown/estimated inputs should report low
 * confidence (spec sections 31-33).
 */
export function calculateConfidence(project: Project): number {
  const assumptions = coreAssumptions(project).filter((a): a is Assumption<number> => a !== undefined);
  const completenessScore = weightedAverage(assumptions.map((a) => [QUALITY_WEIGHT[a.quality], 1]));

  const evidenceScore = weightedAverage([
    [ratingToScore(project.validation.customersInterviewed), 1],
    [ratingToScore(project.validation.hasUsers), 1],
    [ratingToScore(project.validation.hasPayingCustomers), 1.5],
    [ratingToScore(project.validation.hasSignedLois), 1],
  ]);

  const hasRealCustomers = val(project.pricing.currentCustomers) > 0 && project.pricing.currentCustomers.quality !== "unknown";
  const hasRealRevenue = hasRealCustomers && val(project.pricing.productPrice) > 0;
  const cacDataReliable = project.acquisition.newCustomersAcquiredMonthly.quality === "known";
  const churnDataReliable = project.retention.monthlyChurnPct.quality === "known";

  const reliabilityBonus = weightedAverage([
    [hasRealCustomers ? 100 : 0, 1],
    [hasRealRevenue ? 100 : 0, 1],
    [cacDataReliable ? 100 : 0, 1],
    [churnDataReliable ? 100 : 0, 1],
  ]);

  const confidence = weightedAverage([
    [completenessScore, 0.5],
    [evidenceScore, 0.3],
    [reliabilityBonus, 0.2],
  ]);

  return Math.round(Math.min(100, Math.max(0, confidence)));
}
