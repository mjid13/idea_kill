import type {
  AudienceCheck,
  AudienceCheckStatus,
  CalculatedMetrics,
  Currency,
  LenderAssessment,
  LenderMetrics,
  LenderVerdict,
  Project,
} from "@/types";
import { formatCurrency, formatMonths, formatMultiple, formatPercentage } from "@/lib/format";

const VERDICT_COPY: Record<LenderVerdict, { title: string; description: string }> = {
  bankable: {
    title: "Bankable",
    description: "The plan services the loan every month, survives the downside case, and is backed by founder money and security.",
  },
  conditional: {
    title: "Conditional",
    description: "The loan is repayable on the base case, but at least one condition a credit committee tests is short.",
  },
  not_bankable: {
    title: "Not Bankable Yet",
    description: "On these assumptions the plan cannot service the loan — the cash flow, not the story, is what fails.",
  },
};

/**
 * Checks that fail the whole file rather than attaching a condition. Coverage
 * and liquidity are the two questions a lender cannot waive: everything else
 * (security, founder skin, concentration) is priced or covenanted around.
 */
const HARD_CHECK_IDS = new Set(["dscr", "liquidity"]);

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

/** Three-way threshold test for a "higher is better" ratio. */
function band(value: number | null, passAt: number, warnAt: number): AudienceCheckStatus {
  if (value === null) return "warn";
  if (value >= passAt) return "pass";
  if (value >= warnAt) return "warn";
  return "fail";
}

/**
 * Underwrites the project the way a bank does: coverage first, then liquidity,
 * then the stress case, then what backs the loan if all of that is wrong.
 * Deterministic and rule-based, like the insight engine — every verdict can be
 * traced to a threshold.
 *
 * Labels/details are translation keys with numbers passed as params, so the UI
 * layer translates them.
 */
export function assessLenderReadiness(
  lender: LenderMetrics,
  metrics: CalculatedMetrics,
  project: Project,
  locale = "en-US"
): LenderAssessment {
  const currency: Currency = project.basicInfo.currency;
  const money = (v: number | null) => formatCurrency(v, currency, { compact: true });
  const checks: AudienceCheck[] = [];

  // --- Coverage ------------------------------------------------------------
  const dscrStatus: AudienceCheckStatus =
    lender.aggregateDscr === null ? "warn" : lender.aggregateDscr >= lender.targetDscr ? "pass" : lender.aggregateDscr >= 1 ? "warn" : "fail";
  checks.push(
    check(
      "dscr",
      "Debt service coverage (DSCR)",
      dscrStatus,
      formatMultiple(lender.aggregateDscr, 2),
      `≥ ${formatMultiple(lender.targetDscr, 2)}`,
      lender.monthsBelowTargetDscr > 0
        ? "{months} of {term} months fall below the target coverage."
        : "Every month of the term clears the target coverage.",
      { months: lender.monthsBelowTargetDscr, term: lender.termMonths }
    )
  );

  // --- Liquidity -----------------------------------------------------------
  checks.push(
    check(
      "liquidity",
      "Cash never runs out",
      lender.monthsCashNegative > 0 ? "fail" : lender.lowestCashBalance < lender.totalMonthlyDebtService ? "warn" : "pass",
      money(lender.lowestCashBalance),
      "> 0 in every month",
      lender.monthsCashNegative > 0
        ? "Cash goes negative in {months} months — the account cannot fund the instalment."
        : "Lowest projected balance after every instalment is paid.",
      { months: lender.monthsCashNegative }
    )
  );

  // --- Downside ------------------------------------------------------------
  checks.push(
    check(
      "downside",
      "Downside case still repays",
      lender.downside.survives ? "pass" : band(lender.downside.aggregateDscr, 1, 0.85),
      formatMultiple(lender.downside.aggregateDscr, 2),
      "≥ 1.00x",
      "With revenue {haircut} below plan, coverage lands at {dscr} and the lowest balance at {cash}.",
      {
        haircut: formatPercentage(lender.downside.revenueHaircutPct, 0),
        dscr: formatMultiple(lender.downside.aggregateDscr, 2),
        cash: money(lender.downside.lowestCashBalance),
      }
    )
  );

  // --- Debt capacity -------------------------------------------------------
  const capacityRatio = lender.loanAmount > 0 ? lender.debtCapacity / lender.loanAmount : null;
  checks.push(
    check(
      "capacity",
      "Loan sits inside debt capacity",
      band(capacityRatio, 1, 0.8),
      money(lender.debtCapacity),
      `≥ ${money(lender.loanAmount)}`,
      lender.headroom >= 0
        ? "The plan supports {headroom} more debt than requested at the target coverage."
        : "The request exceeds what the plan services by {shortfall}.",
      { headroom: money(Math.max(0, lender.headroom)), shortfall: money(Math.abs(Math.min(0, lender.headroom))) }
    )
  );

  // --- Break-even ----------------------------------------------------------
  const breakEvenStatus: AudienceCheckStatus =
    lender.breakEvenMonth === null
      ? "fail"
      : lender.breakEvenMonth <= 18
        ? "pass"
        : lender.breakEvenMonth <= lender.termMonths
          ? "warn"
          : "fail";
  checks.push(
    check(
      "break-even",
      "Reaches break-even inside the term",
      breakEvenStatus,
      lender.breakEvenMonth === null ? "—" : formatMonths(lender.breakEvenMonth, 0, locale),
      "≤ 18 months",
      lender.breakEvenMonth === null
        ? "The forecast never turns cash-flow positive, so every instalment is paid out of borrowed money."
        : "Monthly cash flow first turns positive in month {month}.",
      { month: lender.breakEvenMonth ?? 0 }
    )
  );

  // --- Founder contribution ------------------------------------------------
  checks.push(
    check(
      "founder-contribution",
      "Founder contribution",
      band(lender.founderContributionPct, 20, 10),
      formatPercentage(lender.founderContributionPct, 0),
      "≥ 20% of total funding",
      "Lenders read the founders' own cash as the first loss they take before the bank does.",
      undefined
    )
  );

  // --- Security ------------------------------------------------------------
  const hasGuarantee = project.debt?.personalGuarantee === true;
  const collateralStatus: AudienceCheckStatus =
    lender.collateralCoverageRatio === null
      ? hasGuarantee
        ? "warn"
        : "fail"
      : band(lender.collateralCoverageRatio, 1, 0.5);
  checks.push(
    check(
      "collateral",
      "Security cover",
      collateralStatus,
      lender.collateralCoverageRatio === null ? (hasGuarantee ? "Personal guarantee only" : "None") : formatMultiple(lender.collateralCoverageRatio, 2),
      "≥ 1.00x of the loan",
      hasGuarantee ? "A personal guarantee is in place alongside any pledged assets." : "No personal guarantee offered.",
      undefined
    )
  );

  // --- Contracted revenue --------------------------------------------------
  checks.push(
    check(
      "contracted-revenue",
      "Contracted revenue covers the instalment",
      band(lender.contractedRevenueCover, 1, 0.5),
      lender.contractedRevenueCover === null ? "—" : formatMultiple(lender.contractedRevenueCover, 2),
      "≥ 1.00x of monthly debt service",
      "Signed contracts are the only revenue a lender treats as committed; the rest is forecast.",
      undefined
    )
  );

  // --- Concentration -------------------------------------------------------
  const concentrationStatus: AudienceCheckStatus =
    metrics.concentration.riskLevel === "low"
      ? "pass"
      : metrics.concentration.riskLevel === "moderate"
        ? "pass"
        : metrics.concentration.riskLevel === "high"
          ? "warn"
          : "fail";
  checks.push(
    check(
      "concentration",
      "Customer concentration",
      concentrationStatus,
      formatPercentage(metrics.concentration.topCustomersRevenueSharePct, 0),
      "≤ 30% from the largest few customers",
      "Losing one concentrated account has to not take the instalment with it.",
      undefined
    )
  );

  const hardFail = checks.some((c) => c.status === "fail" && HARD_CHECK_IDS.has(c.id));
  const anyProblem = checks.some((c) => c.status !== "pass");
  const verdict: LenderVerdict = hardFail ? "not_bankable" : anyProblem ? "conditional" : "bankable";

  return { verdict, ...VERDICT_COPY[verdict], checks };
}
