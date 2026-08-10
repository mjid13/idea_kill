import type { CostAssumptions, OperatingMetrics } from "@/types";
import { val } from "./helpers";

/**
 * Monthly Operating Cost = sum of all fixed monthly expense line items.
 * Monthly Burn = Expenses - Revenue, floored at 0 and reported alongside a
 * cash-flow-positive flag instead of ever being shown as a negative number.
 */
export function calculateMonthlyOperatingCost(costs: CostAssumptions): number {
  return (
    val(costs.founderSalaries) +
    val(costs.employeeSalaries) +
    val(costs.contractorExpenses) +
    val(costs.officeExpenses) +
    val(costs.infrastructure) +
    val(costs.softwareSubscriptions) +
    val(costs.marketing) +
    val(costs.sales) +
    val(costs.legalAccounting) +
    val(costs.otherMonthlyExpenses)
  );
}

export function calculateOperatingMetrics(costs: CostAssumptions, monthlyRevenue: number): OperatingMetrics {
  const monthlyOperatingCost = calculateMonthlyOperatingCost(costs);
  const net = monthlyOperatingCost - monthlyRevenue;

  return {
    monthlyOperatingCost,
    monthlyBurn: Math.max(0, net),
    isCashFlowPositive: net <= 0,
  };
}
