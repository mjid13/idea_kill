import type { FundingAssumptions, FundingMetrics } from "@/types";
import { val } from "./helpers";

/**
 * Runway = Available Cash / Monthly Burn.
 * If monthly burn <= 0 the business is profitable / has no finite runway,
 * which is reported explicitly rather than dividing by zero.
 */
export function calculateFundingMetrics(
  funding: FundingAssumptions,
  monthlyBurn: number,
  isCashFlowPositive: boolean
): FundingMetrics {
  const availableCash = val(funding.availableCash) + val(funding.initialInvestment);
  const netBurn = Math.max(0, monthlyBurn - val(funding.otherMonthlyIncome));

  if (isCashFlowPositive || netBurn <= 0) {
    return { runwayMonths: null, isProfitable: true };
  }

  const runwayMonths = availableCash / netBurn;

  return {
    runwayMonths: Number.isFinite(runwayMonths) ? Math.max(0, runwayMonths) : null,
    isProfitable: false,
  };
}
