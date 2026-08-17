import type {
  AudienceCheck,
  AudienceCheckStatus,
  CalculatedMetrics,
  Currency,
  ForecastMonth,
  InvestorAssessment,
  InvestorMilestone,
  InvestorSummary,
  InvestorVerdict,
  Project,
  ScoreBreakdown,
} from "@/types";
import { calculateEfficiencyMetrics } from "@/lib/calculations/efficiency";
import { calculateFundingRequirement } from "@/lib/calculations/fundingRequirement";
import { forecastProject } from "@/lib/calculations/projectForecast";
import { val } from "@/lib/calculations/helpers";
import { formatCurrency, formatMultiple, formatPercentage } from "@/lib/format";

/** Two years is as far as a seed-stage plan is worth quoting to an investor. */
const HORIZON_MONTHS = 24;

/** Converts a 1-5 assessment rating to 0-100. */
function ratingToScore(rating: number): number {
  return ((rating - 1) / 4) * 100;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Defensibility, from the ratings that actually describe it: how different the
 * product is, how hard it is to leave, how crowded the space is, and whether
 * distribution is owned. Switching ease and competition intensity are inverted —
 * on those, a high rating is bad news for a moat.
 */
function moatScore(project: Project): number {
  const v = project.validation;
  return average([
    ratingToScore(v.differentiationStrength),
    ratingToScore(v.productDifferentiation),
    ratingToScore(6 - v.switchingEase),
    ratingToScore(6 - v.competitionIntensity),
    ratingToScore(v.hasUnfairDistributionAdvantage),
  ]);
}

/** Evidence that someone already wants this, weighted toward people who paid. */
function tractionScore(project: Project): number {
  const v = project.validation;
  return average([
    ratingToScore(v.hasPayingCustomers),
    ratingToScore(v.hasPayingCustomers),
    ratingToScore(v.hasSignedLois),
    ratingToScore(v.hasUsers),
    ratingToScore(v.customersInterviewed),
    ratingToScore(v.customersRequestedSolution),
  ]);
}

function firstMonth(forecast: ForecastMonth[], predicate: (m: ForecastMonth) => boolean): number | null {
  return forecast.find(predicate)?.month ?? null;
}

/** Three-way threshold test for a "higher is better" figure. */
function band(value: number | null, passAt: number, warnAt: number): AudienceCheckStatus {
  if (value === null) return "warn";
  if (value >= passAt) return "pass";
  if (value >= warnAt) return "warn";
  return "fail";
}

/** Same, for a "lower is better" figure (payback months, required penetration). */
function inverseBand(value: number | null, passUnder: number, warnUnder: number): AudienceCheckStatus {
  if (value === null) return "warn";
  if (value <= passUnder) return "pass";
  if (value <= warnUnder) return "warn";
  return "fail";
}

function check(
  id: string,
  label: string,
  status: AudienceCheckStatus,
  value: string,
  requirement: string,
  detail?: string,
  detailParams?: Record<string, string | number>
): AudienceCheck {
  return { id, label, status, value, requirement, detail, detailParams };
}

/**
 * Everything Investor Mode needs. Where Lender Mode asks whether a fixed
 * payment clears every month, this asks the opposite question — how big the
 * upside is and how defensible it stays — so it reads growth, retention,
 * efficiency, moat and the round itself rather than coverage and security.
 */
export function buildInvestorSummary(project: Project, metrics: CalculatedMetrics): InvestorSummary {
  const currency: Currency = project.basicInfo.currency;
  const money = (v: number | null) => formatCurrency(v, currency, { compact: true });

  const forecast = forecastProject(project, metrics, HORIZON_MONTHS);
  const efficiency = calculateEfficiencyMetrics(project, metrics, forecast);
  const requirement = calculateFundingRequirement(project, metrics);

  const arrNow = metrics.revenue.arr;
  const arrMonth12 = (forecast[11]?.mrr ?? 0) * 12;
  const arrMonth24 = (forecast[23]?.mrr ?? 0) * 12;
  const growthMultiple12mo = arrNow > 0 ? arrMonth12 / arrNow : null;

  // The narrative ask wins when the founder entered one; otherwise the plan's
  // own derived requirement stands in, so the round is never blank.
  const enteredAsk = val(project.pitch?.fundingAsk);
  const fundingAskIsDerived = enteredAsk <= 0;
  const fundingAsk = fundingAskIsDerived ? requirement.recommendedRaise : enteredAsk;

  const moat = moatScore(project);
  const traction = tractionScore(project);

  // Runway the round buys: walk the plan's own cash flow with the ask added to
  // the balance and find the month it runs dry.
  let balance = fundingAsk + val(project.funding.availableCash);
  let runwayFromAskMonths: number | null = null;
  for (const month of forecast) {
    balance += month.netCashFlow;
    if (balance < 0) {
      runwayFromAskMonths = month.month;
      break;
    }
  }

  const customerTarget = val(project.pricing.expectedCustomers12mo) || val(project.market.targetCustomers);
  const milestones: InvestorMilestone[] = [
    {
      id: "break-even",
      month: requirement.breakEvenMonth,
      label: "Cash-flow break-even",
      detail: "Monthly gross profit first covers the whole operating base.",
    },
    {
      id: "customer-target",
      month: customerTarget > 0 ? firstMonth(forecast, (m) => m.endingCustomers >= customerTarget) : null,
      label: "{count} customers",
      labelParams: { count: Math.round(customerTarget).toLocaleString("en-US") },
      detail: "The customer count this plan is built around.",
    },
    {
      id: "arr-double",
      month: arrNow > 0 ? firstMonth(forecast, (m) => m.mrr * 12 >= arrNow * 2) : null,
      label: "ARR doubles",
      detail: "First month annualized recurring revenue is twice today's.",
    },
    {
      id: "next-round",
      month: runwayFromAskMonths,
      label: "This round runs out",
      detail: "When the next raise has to be closed, not started.",
    },
  ];

  const checks: AudienceCheck[] = [
    check(
      "market",
      "Market is big enough to matter",
      inverseBand(metrics.market.requiredMarketPenetrationPct, 5, 15),
      money(metrics.market.sam),
      "≤ 5% of SAM to hit plan",
      "The plan needs {penetration} of the serviceable market.",
      { penetration: formatPercentage(metrics.market.requiredMarketPenetrationPct, 1) }
    ),
    check(
      "growth",
      "Growth rate",
      band(growthMultiple12mo, 3, 2),
      growthMultiple12mo === null ? "—" : formatMultiple(growthMultiple12mo, 1),
      "≥ 3x ARR in 12 months",
      "ARR goes from {now} to {future} over the next 12 months.",
      { now: money(arrNow), future: money(arrMonth12) }
    ),
    check(
      "ltv-cac",
      "LTV:CAC",
      band(metrics.unitEconomics.ltvToCacRatio, 3, 1.5),
      formatMultiple(metrics.unitEconomics.ltvToCacRatio),
      "≥ 3x",
      "Lifetime contribution against what it costs to win a customer.",
      undefined
    ),
    check(
      "payback",
      "CAC payback",
      inverseBand(metrics.unitEconomics.cacPaybackMonths, 12, 18),
      metrics.unitEconomics.cacPaybackMonths === null ? "—" : `${metrics.unitEconomics.cacPaybackMonths.toFixed(1)}`,
      "≤ 12 months",
      "Months of contribution needed to earn back one customer's acquisition cost.",
      undefined
    ),
    check(
      "margin",
      "Gross margin",
      band(metrics.unitEconomics.grossMarginPct, 70, 50),
      formatPercentage(metrics.unitEconomics.grossMarginPct, 0),
      "≥ 70%",
      "Software-shaped margin is what makes the growth worth funding.",
      undefined
    ),
    check(
      "retention",
      "Net revenue retention",
      band(metrics.retention.netRevenueRetentionPct, 100, 85),
      formatPercentage(metrics.retention.netRevenueRetentionPct, 0),
      "≥ 100%",
      "Above 100% the installed base grows revenue without a single new sale.",
      undefined
    ),
    check(
      "moat",
      "Defensibility",
      band(moat, 60, 40),
      formatPercentage(moat, 0),
      "≥ 60",
      "Differentiation, switching cost, competitive intensity and owned distribution.",
      undefined
    ),
    check(
      "traction",
      "Traction evidence",
      band(traction, 60, 35),
      formatPercentage(traction, 0),
      "≥ 60",
      "Paying customers and signed LOIs count for more than interviews.",
      undefined
    ),
    check(
      "rule-of-40",
      "Rule of 40",
      band(efficiency.ruleOf40Score, 40, 20),
      efficiency.ruleOf40Score === null ? "—" : formatPercentage(efficiency.ruleOf40Score, 0),
      "≥ 40",
      "Growth rate plus profit margin — the trade-off an investor allows between the two.",
      undefined
    ),
  ];

  return {
    arrNow,
    arrMonth12,
    arrMonth24,
    growthMultiple12mo,
    customersMonth12: forecast[11]?.endingCustomers ?? 0,
    netRevenueRetentionPct: metrics.retention.netRevenueRetentionPct,
    monthlyExpansionRevenuePct: val(project.retention.monthlyExpansionRevenuePct),
    ltvToCacRatio: metrics.unitEconomics.ltvToCacRatio,
    cacPaybackMonths: metrics.unitEconomics.cacPaybackMonths,
    grossMarginPct: metrics.unitEconomics.grossMarginPct,
    ruleOf40Score: efficiency.ruleOf40Score,
    burnMultiple: efficiency.burnMultiple,
    magicNumber: efficiency.magicNumber,
    moatScore: moat,
    tractionScore: traction,
    requiredMarketPenetrationPct: metrics.market.requiredMarketPenetrationPct,
    fundingAsk,
    fundingAskIsDerived,
    runwayFromAskMonths,
    equityGivenUpPct: metrics.dilution.equityGivenUpPct,
    postMoneyValuation: metrics.dilution.postMoneyValuation,
    milestones,
    checks,
  };
}

const VERDICT_COPY: Record<InvestorVerdict, { title: string; description: string }> = {
  fundable: {
    title: "Fundable",
    description: "Market size, growth and unit economics all clear the bar an early-stage fund underwrites to.",
  },
  promising: {
    title: "Promising",
    description: "The shape is right, but at least one of growth, economics or evidence is not yet at fund-returning scale.",
  },
  too_early: {
    title: "Too Early",
    description: "Several of the things a fund buys — growth, retention, defensibility, proof — are still assumptions.",
  },
};

/**
 * Verdict from the checks themselves rather than the viability score: an
 * investor's bar is not "is this a sound business" but "can this return the
 * fund", which is a different and much narrower question.
 */
export function assessInvestorReadiness(summary: InvestorSummary, scores: ScoreBreakdown): InvestorAssessment {
  const fails = summary.checks.filter((c) => c.status === "fail").length;
  const passes = summary.checks.filter((c) => c.status === "pass").length;

  const verdict: InvestorVerdict =
    fails >= 3 || scores.overall < 40 ? "too_early" : fails === 0 && passes >= 6 ? "fundable" : "promising";

  return { verdict, ...VERDICT_COPY[verdict] };
}
