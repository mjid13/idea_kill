import type { CalculatedMetrics, Project } from "@/types";
import { calculateMarketMetrics } from "./market";
import { calculateRevenueMetrics } from "./pricing";
import { calculateAcquisitionMetrics } from "./acquisition";
import { calculateRetentionMetrics } from "./retention";
import { calculateUnitEconomicsMetrics } from "./unitEconomics";
import { calculateOperatingMetrics } from "./opex";
import { calculateFundingMetrics } from "./funding";
import { calculateBreakEvenMetrics } from "./breakeven";
import { val } from "./helpers";

/** Computes every derived metric for a project from its raw assumptions. */
export function calculateMetrics(project: Project): CalculatedMetrics {
  const market = calculateMarketMetrics(project.market);
  const revenue = calculateRevenueMetrics(project.pricing, val(project.acquisition.newCustomersAcquiredMonthly));
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

  return { market, revenue, acquisition, retention, unitEconomics, operating, funding, breakEven };
}
