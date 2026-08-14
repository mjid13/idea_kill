import type { DilutionMetrics, FundingAssumptions } from "@/types";
import { safeDiv, val } from "./helpers";

/**
 * Post-money = pre-money + the cash raised (`initialInvestment`). Null unless
 * `preMoneyValuation` was actually entered — `initialInvestment` of $0 against
 * a known pre-money is a valid 0%-dilution case, not "unknown", so it must not
 * be null-guarded the same way.
 */
export function calculateDilutionMetrics(funding: FundingAssumptions): DilutionMetrics {
  const hasPreMoney = funding.preMoneyValuation && funding.preMoneyValuation.quality !== "unknown";

  if (!hasPreMoney) {
    return { postMoneyValuation: null, equityGivenUpPct: null, founderRemainingOwnershipPct: null };
  }

  const preMoneyValuation = val(funding.preMoneyValuation);
  const initialInvestment = val(funding.initialInvestment);
  const postMoneyValuation = preMoneyValuation + initialInvestment;

  const equityGivenUpPct = safeDiv(initialInvestment, postMoneyValuation);
  const equityGivenUpPctValue = equityGivenUpPct === null ? null : equityGivenUpPct * 100;

  return {
    postMoneyValuation,
    equityGivenUpPct: equityGivenUpPctValue,
    founderRemainingOwnershipPct: equityGivenUpPctValue === null ? null : 100 - equityGivenUpPctValue,
  };
}
