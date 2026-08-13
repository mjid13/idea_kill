import type { CalculatedMetrics, Project } from "@/types";
import { calculateMarketMetrics } from "./market";
import { calculateRevenueMetrics } from "./pricing";
import { calculateAcquisitionMetrics } from "./acquisition";
import { calculateRetentionMetrics } from "./retention";
import { calculateUnitEconomicsMetrics } from "./unitEconomics";
import { calculateOperatingMetrics } from "./opex";
import { calculateFundingMetrics } from "./funding";
import { calculateBreakEvenMetrics } from "./breakeven";
import { calculateDilutionMetrics } from "./dilution";
import { calculateConcentrationMetrics } from "./concentration";
import { calculateMarketplaceMetrics } from "./marketplace";
import { val } from "./helpers";

/** Computes every derived metric for a project from its raw assumptions. */
export function calculateMetrics(project: Project): CalculatedMetrics {
  const market = calculateMarketMetrics(project.market);

  const baselineRevenue = calculateRevenueMetrics(project.pricing, val(project.acquisition.newCustomersAcquiredMonthly));
  // Marketplace correctness fix: GMV x take-rate replaces the SaaS-style
  // "revenue per customer" baseline. This must happen before anything else
  // consumes `revenue.*` (unitEconomics/breakEven both do), or LTV and
  // break-even would silently use the wrong ARPU while displayed MRR/ARR
  // show the corrected figures.
  const marketplace =
    project.basicInfo.businessModel === "marketplace"
      ? calculateMarketplaceMetrics(project.marketplace, project.pricing)
      : null;
  const revenue = marketplace
    ? {
        ...baselineRevenue,
        monthlyRevenue: marketplace.takeRateRevenue,
        mrr: marketplace.takeRateRevenue,
        arr: marketplace.takeRateRevenue * 12,
        annualRevenue: marketplace.takeRateRevenue * 12,
        monthlyArpu: marketplace.effectiveArpu,
      }
    : baselineRevenue;

  const acquisition = calculateAcquisitionMetrics(project.acquisition);
  const retention = calculateRetentionMetrics(project.retention);

  const unitEconomics = calculateUnitEconomicsMetrics(
    project.unitEconomics,
    revenue.monthlyArpu,
    acquisition.cac,
    retention.monthlyChurnPct
  );

  const operating = calculateOperatingMetrics(project.costs, revenue.monthlyRevenue);
  const funding = calculateFundingMetrics(project.funding, operating.monthlyBurn, operating.isCashFlowPositive);

  const breakEven = calculateBreakEvenMetrics(
    operating.monthlyOperatingCost,
    unitEconomics.grossProfitPerCustomer,
    revenue.monthlyArpu,
    val(project.pricing.currentCustomers)
  );

  const dilution = calculateDilutionMetrics(project.funding);
  const concentration = calculateConcentrationMetrics(project.pricing);

  return {
    market,
    revenue,
    acquisition,
    retention,
    unitEconomics,
    operating,
    funding,
    breakEven,
    dilution,
    concentration,
    marketplace,
  };
}
