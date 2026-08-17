import type { CalculatedMetrics, FundingRequirementMetrics, Project } from "@/types";
import { clamp, val, valOrDefault } from "./helpers";
import { findBreakEvenMonth } from "./forecast";
import { forecastProject } from "./projectForecast";

export const DEFAULT_MONTHS_TO_MILESTONE = 12;
export const DEFAULT_SAFETY_BUFFER_MONTHS = 3;
export const DEFAULT_CONTINGENCY_PCT = 18;
/** Break-even is reported from this horizon even when the funded window is shorter. */
const BREAK_EVEN_SEARCH_MONTHS = 36;
const DAYS_PER_MONTH = 30;

/**
 * Rounds a raise up to a number a founder would actually put in a deck —
 * granularity scales with size, so 74,340 becomes 75,000 rather than 74,400.
 */
export function roundUpToRaiseIncrement(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const increment = value < 10_000 ? 500 : value < 100_000 ? 5_000 : value < 1_000_000 ? 25_000 : 100_000;
  return Math.ceil(value / increment) * increment;
}

/**
 * Sizes the raise from the plan instead of asking the founder for a number:
 *
 *   required financing = operating spend to milestone
 *                      + safety buffer
 *                      + working capital
 *                      + CAPEX
 *                      − expected cash receipts
 *                      − cash on hand
 *
 * and then adds a contingency percentage to get a recommended raise. Cash out
 * and cash in both come from the same forecast the dashboard charts use, so
 * the number always agrees with the projections shown elsewhere.
 *
 * `initialInvestment` is deliberately excluded from cash on hand: it is the
 * round being sized here, so counting it would cancel out the requirement.
 *
 * Kept outside CalculatedMetrics for the same reason as EfficiencyMetrics —
 * it consumes a forecast, and the forecast consumes CalculatedMetrics.
 */
export function calculateFundingRequirement(project: Project, metrics: CalculatedMetrics): FundingRequirementMetrics {
  const funding = project.funding;

  const monthsToMilestone = Math.round(
    clamp(valOrDefault(funding.monthsToMilestone, DEFAULT_MONTHS_TO_MILESTONE), 1, 120)
  );
  const safetyBufferMonths = Math.max(0, valOrDefault(funding.safetyBufferMonths, DEFAULT_SAFETY_BUFFER_MONTHS));
  const receivableDays = Math.max(0, valOrDefault(funding.receivableDays, 0));
  const capex = Math.max(0, val(funding.capex));
  const contingencyPct = clamp(valOrDefault(funding.contingencyPct, DEFAULT_CONTINGENCY_PCT), 0, 100);
  const otherMonthlyIncome = val(funding.otherMonthlyIncome);

  const forecast = forecastProject(project, metrics, Math.max(monthsToMilestone, BREAK_EVEN_SEARCH_MONTHS));
  const window = forecast.slice(0, monthsToMilestone);

  const operatingSpendToMilestone = window.reduce((sum, month) => sum + month.operatingExpenses + month.variableCosts, 0);
  const expectedCashReceipts = window.reduce((sum, month) => sum + month.revenue + otherMonthlyIncome, 0);

  // Buffer and working capital are sized on the run rate at the milestone —
  // the point the business has to survive from — not on today's smaller numbers.
  const milestoneMonth = window[window.length - 1];
  const milestoneSpend = milestoneMonth.operatingExpenses + milestoneMonth.variableCosts;
  const milestoneReceipts = milestoneMonth.revenue + otherMonthlyIncome;
  const milestoneNetBurn = Math.max(0, milestoneSpend - milestoneReceipts);

  const safetyBuffer = safetyBufferMonths * milestoneNetBurn;
  const workingCapital = (receivableDays / DAYS_PER_MONTH) * milestoneMonth.revenue;
  const cashOnHand = val(funding.availableCash);

  const requiredFinancing = Math.max(
    0,
    operatingSpendToMilestone + safetyBuffer + workingCapital + capex - expectedCashReceipts - cashOnHand
  );
  const contingencyAmount = requiredFinancing * (contingencyPct / 100);
  const recommendedRaise = roundUpToRaiseIncrement(requiredFinancing + contingencyAmount);

  return {
    monthsToMilestone,
    operatingSpendToMilestone,
    expectedCashReceipts,
    safetyBuffer,
    workingCapital,
    capex,
    cashOnHand,
    requiredFinancing,
    contingencyPct,
    contingencyAmount,
    recommendedRaise,
    breakEvenMonth: findBreakEvenMonth(forecast),
    isSelfFunded: requiredFinancing <= 0,
  };
}
