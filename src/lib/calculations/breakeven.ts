import type { BreakEvenMetrics } from "@/types";
import { safeDiv } from "./helpers";

/**
 * Contribution Margin Per Customer = Revenue Per Customer - Variable Cost Per Customer
 * Break-even Customers = Fixed Monthly Costs / Contribution Margin Per Customer
 * Break-even Revenue = Break-even Customers x ARPU
 */
export function calculateBreakEvenMetrics(
  fixedMonthlyCosts: number,
  contributionMarginPerCustomer: number,
  monthlyArpu: number,
  currentCustomers: number
): BreakEvenMetrics {
  const breakEvenCustomersRaw = safeDiv(fixedMonthlyCosts, contributionMarginPerCustomer);
  const breakEvenCustomers =
    breakEvenCustomersRaw === null ? null : Math.max(0, Math.ceil(breakEvenCustomersRaw));

  const breakEvenRevenue = breakEvenCustomers === null ? null : breakEvenCustomers * monthlyArpu;

  const remainingCustomersToBreakEven =
    breakEvenCustomers === null ? null : Math.max(0, breakEvenCustomers - currentCustomers);

  return {
    contributionMarginPerCustomer,
    breakEvenCustomers,
    breakEvenRevenue,
    remainingCustomersToBreakEven,
  };
}
