import type { RevenueMixMetrics, UnitEconomicsAssumptions, UnitEconomicsMetrics } from "@/types";
import { pct, safeDiv, val } from "./helpers";

/** Churn of ~0 means an indefinite lifetime; cap at 1000 months (~83 years) so the UI never sees Infinity. */
const MAX_LIFETIME_MONTHS = 1000;

/**
 * Gross Profit Per Customer = Revenue Per Customer - Variable Costs Per Customer
 * Gross Margin = Gross Profit / Revenue
 * LTV = Monthly ARPU x Gross Margin % / Monthly Churn Rate (contribution-margin based, not raw revenue)
 * LTV:CAC = LTV / CAC
 * CAC Payback Period = CAC / Monthly Gross Profit Per Customer
 *
 * When the project defines a hybrid revenue mix, `mix` takes over the revenue
 * and delivery-cost side of these formulas — see `calculateHybridUnitEconomics`
 * for why the one-time and recurring halves cannot be averaged together.
 */
export function calculateUnitEconomicsMetrics(
  unitEconomics: UnitEconomicsAssumptions,
  monthlyArpu: number,
  cac: number | null,
  monthlyChurnPct: number,
  mix?: RevenueMixMetrics | null
): UnitEconomicsMetrics {
  if (mix) return calculateHybridUnitEconomics(unitEconomics, mix, cac, monthlyChurnPct);

  const revenuePerCustomer = val(unitEconomics.revenuePerCustomer);
  const directCost = val(unitEconomics.directCostPerCustomer);
  const paymentProcessingCost = revenuePerCustomer * pct(val(unitEconomics.paymentProcessingPct));
  const infrastructure = val(unitEconomics.infrastructureCostPerCustomer);
  const support = val(unitEconomics.supportCostPerCustomer);
  const other = val(unitEconomics.otherVariableCostPerCustomer);

  const variableCostPerCustomer = directCost + paymentProcessingCost + infrastructure + support + other;
  const grossProfitPerCustomer = revenuePerCustomer - variableCostPerCustomer;
  const grossMarginPct = (safeDiv(grossProfitPerCustomer, revenuePerCustomer) ?? 0) * 100;

  const churnRate = pct(monthlyChurnPct);
  const ltv =
    churnRate > 0
      ? (monthlyArpu * pct(grossMarginPct)) / churnRate
      : monthlyArpu * pct(grossMarginPct) * MAX_LIFETIME_MONTHS;

  const ltvToCacRatio = cac === null ? null : safeDiv(ltv, cac);

  const monthlyGrossProfitPerCustomer = grossProfitPerCustomer; // per-customer monthly figure
  const cacPaybackMonths = cac === null ? null : safeDiv(cac, monthlyGrossProfitPerCustomer);

  return {
    variableCostPerCustomer,
    grossProfitPerCustomer,
    grossMarginPct,
    ltv,
    ltvToCacRatio,
    cacPaybackMonths: cacPaybackMonths !== null && cacPaybackMonths < 0 ? null : cacPaybackMonths,
    recurringGrossProfitPerCustomer: grossProfitPerCustomer,
    oneTimeGrossProfitPerCustomer: 0,
  };
}

/**
 * Customer-level variable costs: the per-customer, per-month lines that apply
 * on top of whatever each revenue stream's own `deliveryCostPct` already
 * covers. Exported so the forecast charges exactly the same set — if the two
 * drift apart, the projection and the break-even section start telling
 * different stories about the same project.
 */
export function customerLevelMonthlyCost(unitEconomics: UnitEconomicsAssumptions): number {
  return (
    val(unitEconomics.directCostPerCustomer) +
    val(unitEconomics.infrastructureCostPerCustomer) +
    val(unitEconomics.supportCostPerCustomer) +
    val(unitEconomics.otherVariableCostPerCustomer)
  );
}

/**
 * Hybrid unit economics: an upfront audit, a paid implementation, a platform
 * subscription and metered usage do not average into one number without
 * distorting the business.
 *
 *   LTV        = one-time contribution (collected once, on acquisition)
 *              + recurring contribution / monthly churn (collected every month)
 *   CAC payback = (CAC - one-time contribution) / recurring contribution
 *
 * A $10k implementation fee that more than covers a $6k CAC means payback is
 * immediate — averaging it into ARPU would instead show a fictitious multi-month
 * payback and understate LTV.
 *
 * Cost model: each stream's `deliveryCostPct` covers the cost of delivering
 * that stream, and the `unitEconomics` per-customer cost lines (direct,
 * infrastructure, support, other) apply on top as customer-level costs.
 * Payment processing is charged against both halves of the mix, since the
 * processor takes its cut of every payment.
 */
function calculateHybridUnitEconomics(
  unitEconomics: UnitEconomicsAssumptions,
  mix: RevenueMixMetrics,
  cac: number | null,
  monthlyChurnPct: number
): UnitEconomicsMetrics {
  const processingRate = pct(val(unitEconomics.paymentProcessingPct));
  const customerLevelCost = customerLevelMonthlyCost(unitEconomics);

  const recurringRevenue = mix.recurringArpu;
  const oneTimeRevenue = mix.oneTimeRevenuePerNewCustomer;

  const recurringDeliveryCost = recurringRevenue * (1 - pct(mix.recurringGrossMarginPct));
  const oneTimeDeliveryCost = oneTimeRevenue * (1 - pct(mix.oneTimeGrossMarginPct));

  const recurringCost = recurringDeliveryCost + recurringRevenue * processingRate + customerLevelCost;
  const oneTimeCost = oneTimeDeliveryCost + oneTimeRevenue * processingRate;

  const recurringGrossProfitPerCustomer = recurringRevenue - recurringCost;
  const oneTimeGrossProfitPerCustomer = oneTimeRevenue - oneTimeCost;

  // The headline per-customer figures describe a month of steady-state
  // operation: recurring revenue from the whole base, plus the one-time revenue
  // the current acquisition rate delivers, spread over the existing base. With
  // no customer count to spread it over (a project sized before it has any
  // customers) the one-time figure stands on its own, per acquired customer.
  const existingCustomers = safeDiv(mix.monthlyRecurringRevenue, recurringRevenue);
  const oneTimePerExistingCustomer =
    existingCustomers !== null && existingCustomers > 0 ? mix.monthlyOneTimeRevenue / existingCustomers : oneTimeRevenue;
  const blendedRevenuePerCustomer = recurringRevenue + oneTimePerExistingCustomer;
  const oneTimeCostShare =
    oneTimeRevenue > 0 ? (oneTimeCost / oneTimeRevenue) * oneTimePerExistingCustomer : 0;
  const variableCostPerCustomer = recurringCost + oneTimeCostShare;
  const grossProfitPerCustomer = blendedRevenuePerCustomer - variableCostPerCustomer;
  const grossMarginPct = (safeDiv(grossProfitPerCustomer, blendedRevenuePerCustomer) ?? 0) * 100;

  const churnRate = pct(monthlyChurnPct);
  const lifetimeMonths = churnRate > 0 ? 1 / churnRate : MAX_LIFETIME_MONTHS;
  const ltv = oneTimeGrossProfitPerCustomer + recurringGrossProfitPerCustomer * lifetimeMonths;

  const ltvToCacRatio = cac === null ? null : safeDiv(ltv, cac);

  // One-time contribution is collected at acquisition, so it pays down CAC
  // before the recurring stream starts amortizing the remainder.
  const unrecoveredCac = cac === null ? null : cac - oneTimeGrossProfitPerCustomer;
  const cacPaybackMonths =
    unrecoveredCac === null ? null : unrecoveredCac <= 0 ? 0 : safeDiv(unrecoveredCac, recurringGrossProfitPerCustomer);

  return {
    variableCostPerCustomer,
    grossProfitPerCustomer,
    grossMarginPct,
    ltv,
    ltvToCacRatio,
    cacPaybackMonths: cacPaybackMonths !== null && cacPaybackMonths < 0 ? null : cacPaybackMonths,
    recurringGrossProfitPerCustomer,
    oneTimeGrossProfitPerCustomer,
  };
}
