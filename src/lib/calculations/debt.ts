import type {
  AnnualDebtService,
  CalculatedMetrics,
  DebtServiceMonth,
  DownsideCase,
  ForecastMonth,
  LenderMetrics,
  Project,
  RepaymentMonth,
} from "@/types";
import { clamp, safeDiv, val, valOrDefault } from "./helpers";
import { findBreakEvenMonth } from "./forecast";
import { forecastProject } from "./projectForecast";
import { calculateFundingRequirement } from "./fundingRequirement";

/** Minimum coverage a commercial lender underwrites to when nothing else is stated. */
export const DEFAULT_TARGET_DSCR = 1.25;
export const DEFAULT_LOAN_TERM_MONTHS = 60;
export const DEFAULT_DOWNSIDE_HAIRCUT_PCT = 30;
/** Break-even and cash are reported from at least this horizon even for a short loan. */
const MIN_FORECAST_MONTHS = 36;
const MAX_FORECAST_MONTHS = 120;
const DAYS_PER_MONTH = 30;

export interface RepaymentScheduleInput {
  principal: number;
  annualInterestRatePct: number;
  termMonths: number;
  /** Interest-only months at the front of the term. Clamped below the term. */
  gracePeriodMonths: number;
}

/**
 * Level payment on an annuity loan: P x r / (1 − (1+r)^−n). Falls back to
 * straight-line when the rate is zero (an interest-free family loan is a real
 * case here, and the annuity formula divides by zero on it).
 */
export function annuityPayment(principal: number, monthlyRate: number, months: number): number {
  if (months <= 0 || principal <= 0) return 0;
  if (monthlyRate <= 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, -months);
  return (principal * monthlyRate) / (1 - factor);
}

/** Present value of `payment` received for `months` at `monthlyRate` — the inverse of `annuityPayment`. */
export function annuityPresentValue(payment: number, monthlyRate: number, months: number): number {
  if (months <= 0 || payment <= 0) return 0;
  if (monthlyRate <= 0) return payment * months;
  return (payment * (1 - Math.pow(1 + monthlyRate, -months))) / monthlyRate;
}

/**
 * Month-by-month amortization. Interest accrues on the opening balance every
 * month including the grace period — a grace period defers principal, not
 * interest, which is exactly the distinction that makes a "cheap" 12-month
 * grace expensive over a 5-year term.
 */
export function buildRepaymentSchedule(input: RepaymentScheduleInput): RepaymentMonth[] {
  const principal = Math.max(0, input.principal);
  const termMonths = Math.max(0, Math.round(input.termMonths));
  if (principal <= 0 || termMonths <= 0) return [];

  const gracePeriodMonths = clamp(Math.round(input.gracePeriodMonths), 0, Math.max(0, termMonths - 1));
  const monthlyRate = Math.max(0, input.annualInterestRatePct) / 100 / 12;
  const amortizingMonths = termMonths - gracePeriodMonths;
  const levelPayment = annuityPayment(principal, monthlyRate, amortizingMonths);

  const schedule: RepaymentMonth[] = [];
  let balance = principal;

  for (let month = 1; month <= termMonths; month++) {
    const openingBalance = balance;
    const interest = openingBalance * monthlyRate;

    let principalPaid: number;
    if (month <= gracePeriodMonths) {
      principalPaid = 0;
    } else {
      // The final instalment clears whatever rounding left behind rather than
      // leaving a balance of a few units outstanding forever.
      principalPaid = month === termMonths ? openingBalance : Math.min(openingBalance, levelPayment - interest);
    }

    balance = Math.max(0, openingBalance - principalPaid);
    schedule.push({
      month,
      openingBalance,
      interest,
      principal: principalPaid,
      payment: principalPaid + interest,
      closingBalance: balance,
    });
  }

  return schedule;
}

function aggregateDscr(months: DebtServiceMonth[]): number | null {
  const totalCash = months.reduce((sum, m) => sum + m.cashAvailableForDebtService, 0);
  const totalService = months.reduce((sum, m) => sum + m.debtService, 0);
  return safeDiv(totalCash, totalService);
}

function minimumDscr(months: DebtServiceMonth[]): number | null {
  const values = months.map((m) => m.dscr).filter((d): d is number => d !== null);
  return values.length === 0 ? null : Math.min(...values);
}

/**
 * Pairs each forecast month with its scheduled debt service and tracks the cash
 * left afterwards. `startingCash` is the money actually in the account on day
 * one of the loan: cash on hand + the founders' own injection + the disbursed
 * principal.
 */
function buildDebtService(
  forecast: ForecastMonth[],
  schedule: RepaymentMonth[],
  existingMonthlyDebtService: number,
  startingCash: number
): DebtServiceMonth[] {
  const months = Math.min(forecast.length, Math.max(schedule.length, 0)) || forecast.length;
  const result: DebtServiceMonth[] = [];
  let cashBalance = startingCash;

  for (let i = 0; i < months; i++) {
    const month = forecast[i];
    const loanPayment = schedule[i]?.payment ?? 0;
    const debtService = loanPayment + existingMonthlyDebtService;
    const cashAvailableForDebtService = month.netCashFlow;

    cashBalance += cashAvailableForDebtService - debtService;
    result.push({
      month: month.month,
      cashAvailableForDebtService,
      debtService,
      dscr: debtService > 0 ? safeDiv(cashAvailableForDebtService, debtService) : null,
      cashBalance,
    });
  }

  return result;
}

function aggregateByYear(service: DebtServiceMonth[]): AnnualDebtService[] {
  const years: AnnualDebtService[] = [];
  for (const month of service) {
    const year = Math.ceil(month.month / 12);
    let bucket = years.find((y) => y.year === year);
    if (!bucket) {
      bucket = { year, cashAvailableForDebtService: 0, debtService: 0, dscr: null };
      years.push(bucket);
    }
    bucket.cashAvailableForDebtService += month.cashAvailableForDebtService;
    bucket.debtService += month.debtService;
  }
  for (const bucket of years) {
    bucket.dscr = safeDiv(bucket.cashAvailableForDebtService, bucket.debtService);
  }
  return years;
}

/**
 * The largest principal this plan's own cash flow supports at the target
 * coverage. Sized on average CFADS across the term — deliberately including the
 * loss-making early months, since a lender is repaid out of the whole term and
 * not out of the best month in it — net of debt service already committed
 * elsewhere, then discounted back over the amortizing months.
 */
export function calculateDebtCapacity(input: {
  service: DebtServiceMonth[];
  targetDscr: number;
  existingMonthlyDebtService: number;
  annualInterestRatePct: number;
  termMonths: number;
  gracePeriodMonths: number;
}): number {
  const { service, targetDscr, existingMonthlyDebtService } = input;
  if (service.length === 0 || targetDscr <= 0) return 0;

  const averageCash = service.reduce((sum, m) => sum + m.cashAvailableForDebtService, 0) / service.length;
  const affordableDebtService = averageCash / targetDscr - existingMonthlyDebtService;
  if (affordableDebtService <= 0) return 0;

  const termMonths = Math.max(0, Math.round(input.termMonths));
  const gracePeriodMonths = clamp(Math.round(input.gracePeriodMonths), 0, Math.max(0, termMonths - 1));
  const monthlyRate = Math.max(0, input.annualInterestRatePct) / 100 / 12;
  return Math.max(0, annuityPresentValue(affordableDebtService, monthlyRate, termMonths - gracePeriodMonths));
}

function buildDownsideCase(
  project: Project,
  metrics: CalculatedMetrics,
  schedule: RepaymentMonth[],
  months: number,
  haircutPct: number,
  existingMonthlyDebtService: number,
  startingCash: number
): DownsideCase {
  const revenueHaircutPct = clamp(haircutPct, 0, 95);
  // A price multiplier scales revenue and its variable costs together, which is
  // what a volume/price shortfall actually does — margins hold, the cash does not.
  const stressed = forecastProject(project, metrics, months, { priceMultiplier: 1 - revenueHaircutPct / 100 });
  const service = buildDebtService(stressed, schedule, existingMonthlyDebtService, startingCash);

  const lowestCashBalance = service.length === 0 ? startingCash : Math.min(...service.map((m) => m.cashBalance));
  const monthsBelowOne = service.filter((m) => m.dscr !== null && m.dscr < 1).length;

  return {
    revenueHaircutPct,
    minDscr: minimumDscr(service),
    aggregateDscr: aggregateDscr(service),
    monthsBelowOne,
    lowestCashBalance,
    survives: monthsBelowOne === 0 && lowestCashBalance >= 0,
  };
}

/**
 * Everything Lender Mode needs, derived from the same forecast the dashboard
 * charts use so the two never disagree.
 *
 * CFADS is the forecast's net cash flow (gross profit − operating expenses +
 * other income): the forecast knows nothing about debt, so its net cash flow is
 * by construction the cash available *before* debt service.
 *
 * Kept outside CalculatedMetrics for the same reason as EfficiencyMetrics and
 * FundingRequirementMetrics — it consumes a forecast, and the forecast consumes
 * CalculatedMetrics.
 */
export function calculateLenderMetrics(project: Project, metrics: CalculatedMetrics): LenderMetrics {
  const debt = project.debt;
  const requirement = calculateFundingRequirement(project, metrics);

  // No entered ask means "show me what my plan implies" rather than an empty
  // schedule, so the derived requirement stands in until the founder overrides it.
  const enteredLoanAmount = valOrDefault(debt?.loanAmount, 0);
  const loanAmountIsDerived = enteredLoanAmount <= 0;
  const loanAmount = loanAmountIsDerived ? requirement.recommendedRaise : enteredLoanAmount;

  const annualInterestRatePct = Math.max(0, valOrDefault(debt?.annualInterestRatePct, 0));
  const termMonths = Math.round(clamp(valOrDefault(debt?.termMonths, DEFAULT_LOAN_TERM_MONTHS), 1, 360));
  const gracePeriodMonths = clamp(Math.round(valOrDefault(debt?.gracePeriodMonths, 0)), 0, termMonths - 1);
  const existingMonthlyDebtService = Math.max(0, valOrDefault(debt?.existingMonthlyDebtService, 0));
  const founderContribution = Math.max(0, valOrDefault(debt?.founderContribution, 0));
  const collateralValue = Math.max(0, valOrDefault(debt?.collateralValue, 0));
  const contractedMonthlyRevenue = Math.max(0, valOrDefault(debt?.contractedMonthlyRevenue, 0));
  const targetDscr = Math.max(0.1, valOrDefault(debt?.targetDscr, DEFAULT_TARGET_DSCR));
  const downsideRevenueHaircutPct = valOrDefault(debt?.downsideRevenueHaircutPct, DEFAULT_DOWNSIDE_HAIRCUT_PCT);

  const horizon = clamp(Math.max(termMonths, MIN_FORECAST_MONTHS), 1, MAX_FORECAST_MONTHS);
  const forecast = forecastProject(project, metrics, horizon);

  const schedule = buildRepaymentSchedule({ principal: loanAmount, annualInterestRatePct, termMonths, gracePeriodMonths });
  const startingCash = val(project.funding.availableCash) + founderContribution + loanAmount;
  const service = buildDebtService(forecast.slice(0, termMonths), schedule, existingMonthlyDebtService, startingCash);

  const amortizingPayment = schedule.find((m) => m.principal > 0)?.payment ?? schedule[0]?.payment ?? 0;
  const totalInterest = schedule.reduce((sum, m) => sum + m.interest, 0);
  const totalRepayment = schedule.reduce((sum, m) => sum + m.payment, 0);

  const lowestCashBalance = service.length === 0 ? startingCash : Math.min(...service.map((m) => m.cashBalance));
  const receivableDays = Math.max(0, valOrDefault(project.funding.receivableDays, 0));

  const debtCapacity = calculateDebtCapacity({
    service,
    targetDscr,
    existingMonthlyDebtService,
    annualInterestRatePct,
    termMonths,
    gracePeriodMonths,
  });

  return {
    loanAmount,
    loanAmountIsDerived,
    annualInterestRatePct,
    termMonths,
    gracePeriodMonths,
    monthlyPayment: amortizingPayment,
    totalMonthlyDebtService: amortizingPayment + existingMonthlyDebtService,
    totalInterest,
    totalRepayment,
    schedule,
    service,
    annual: aggregateByYear(service),
    targetDscr,
    minDscr: minimumDscr(service),
    aggregateDscr: aggregateDscr(service),
    monthsBelowTargetDscr: service.filter((m) => m.dscr !== null && m.dscr < targetDscr).length,
    firstCoveredMonth: service.find((m) => m.dscr !== null && m.dscr >= 1)?.month ?? null,
    debtCapacity,
    headroom: debtCapacity - loanAmount,
    collateralCoverageRatio: collateralValue > 0 ? safeDiv(collateralValue, loanAmount) : null,
    founderContributionPct:
      founderContribution + loanAmount > 0 ? (founderContribution / (founderContribution + loanAmount)) * 100 : null,
    contractedRevenueCover:
      contractedMonthlyRevenue > 0 ? safeDiv(contractedMonthlyRevenue, amortizingPayment + existingMonthlyDebtService) : null,
    receivablesBalance: (receivableDays / DAYS_PER_MONTH) * metrics.revenue.monthlyRevenue,
    breakEvenMonth: findBreakEvenMonth(forecast),
    lowestCashBalance,
    monthsCashNegative: service.filter((m) => m.cashBalance < 0).length,
    downside: buildDownsideCase(
      project,
      metrics,
      schedule,
      termMonths,
      downsideRevenueHaircutPct,
      existingMonthlyDebtService,
      startingCash
    ),
  };
}
