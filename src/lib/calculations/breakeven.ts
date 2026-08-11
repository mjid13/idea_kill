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
  // A zero or negative contribution margin means break-even is mathematically
  // unreachable (each customer adds no profit, or actively loses money) —
  // treat both the same as the divide-by-zero case rather than only >=0
  // negatives falling through safeDiv, which would otherwise clamp to 0 via
  // Math.max below and read as "already broke even".
  const breakEvenCustomersRaw =
    contributionMarginPerCustomer <= 0 ? null : safeDiv(fixedMonthlyCosts, contributionMarginPerCustomer);
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
