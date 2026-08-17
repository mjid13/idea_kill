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
import { calculateRevenueMix } from "./revenueStreams";
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
  // A project that lists revenue streams is describing hybrid economics (audit
  // + implementation + platform + usage + support), which supersedes both the
  // single-price model and the marketplace special case — a take-rate stream is
  // just one of the kinds the mix understands.
  const revenueMix = calculateRevenueMix(project.revenueStreams, {
    currentCustomers: val(project.pricing.currentCustomers),
    newCustomersPerMonth: val(project.acquisition.newCustomersAcquiredMonthly),
  });

  const revenue = revenueMix
    ? {
        // ARPU stays the recurring figure — the number that compounds over a
        // customer's lifetime. One-time revenue reaches the totals below and
        // LTV separately, because averaging it into ARPU would imply the
        // customer pays the setup fee again every month.
        monthlyArpu: revenueMix.recurringArpu > 0 ? revenueMix.recurringArpu : revenueMix.oneTimeRevenuePerNewCustomer,
        mrr: revenueMix.monthlyRecurringRevenue,
        arr: revenueMix.monthlyRecurringRevenue * 12,
        monthlyRevenue: revenueMix.totalMonthlyRevenue,
        annualRevenue: revenueMix.totalMonthlyRevenue * 12,
      }
    : marketplace
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
    retention.monthlyChurnPct,
    revenueMix
  );

  const operating = calculateOperatingMetrics(project.costs, revenue.monthlyRevenue);
  const funding = calculateFundingMetrics(project.funding, operating.monthlyBurn, operating.isCashFlowPositive);

  // In a hybrid mix, one-time work (audits, implementations) covers part of the
  // fixed cost base every month at the current acquisition rate, and only the
  // recurring contribution scales with the installed customer base — so the
  // break-even question becomes "how many subscribers, given the project work
  // already booked this month".
  const monthlyOneTimeContribution = revenueMix
    ? unitEconomics.oneTimeGrossProfitPerCustomer * val(project.acquisition.newCustomersAcquiredMonthly)
    : 0;
  const breakEven = calculateBreakEvenMetrics(
    operating.monthlyOperatingCost - monthlyOneTimeContribution,
    revenueMix ? unitEconomics.recurringGrossProfitPerCustomer : unitEconomics.grossProfitPerCustomer,
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
    revenueMix,
  };
}
