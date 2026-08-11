import type { CalculatedMetrics, Insight, InsightReport, Project, ScoreBreakdown } from "@/types";
import { getBenchmarks } from "@/lib/scoring/benchmarks";
import { interpolateScore } from "@/lib/scoring/interpolate";

let idCounter = 0;
function insight(
  message: string,
  detail?: string,
  messageParams?: Record<string, string | number>,
  detailParams?: Record<string, string | number>
): Insight {
  idCounter += 1;
  return { id: `insight-${idCounter}`, message, messageParams, detail, detailParams };
}

/**
 * Deterministic, rule-based insight generation — no AI required (spec
 * section 21). Every rule reads directly from calculated metrics/scores so
 * the reasoning is reproducible and auditable. Messages/details are
 * translation keys — any interpolated values travel as params rather than
 * being baked into the string, so the UI layer can translate them.
 */
export function generateInsights(metrics: CalculatedMetrics, scores: ScoreBreakdown, project: Project): InsightReport {
  const strengths: Insight[] = [];
  const warnings: Insight[] = [];
  const criticalRisks: Insight[] = [];
  const opportunities: Insight[] = [];
  const recommendedActions: Insight[] = [];

  const benchmarks = getBenchmarks(project.basicInfo.businessModel);
  const { unitEconomics, funding, operating, breakEven, market, retention, acquisition } = metrics;

  // --- LTV:CAC ---------------------------------------------------------
  if (unitEconomics.ltvToCacRatio !== null) {
    if (unitEconomics.ltvToCacRatio < 1) {
      criticalRisks.push(
        insight(
          "Customer acquisition currently destroys value.",
          "Each customer costs more to acquire than their estimated lifetime contribution."
        )
      );
    } else if (unitEconomics.ltvToCacRatio < 3) {
      warnings.push(
        insight(
          "Customer economics are below a healthy threshold.",
          "LTV:CAC is between 1x and 3x — acquisition is not destructive, but margins for error are thin."
        )
      );
    } else {
      strengths.push(
        insight(
          "Your customer economics appear healthy based on the current assumptions.",
          "LTV:CAC is {value}x.",
          undefined,
          { value: unitEconomics.ltvToCacRatio.toFixed(1) }
        )
      );
      if (unitEconomics.ltvToCacRatio > 5) {
        opportunities.push(
          insight(
            "LTV:CAC is very high, which can indicate under-investment in growth.",
            "Consider increasing acquisition spend to capture the market faster."
          )
        );
      }
    }
  }

  // --- Runway ------------------------------------------------------------
  if (funding.isProfitable) {
    strengths.push(insight("Cash Flow Positive.", "Monthly revenue currently covers operating expenses."));
  } else if (funding.runwayMonths !== null) {
    if (funding.runwayMonths < 6) {
      criticalRisks.push(
        insight(
          "Cash runway is a major risk.",
          "At the current burn rate the business has {months} months of runway — less than six months.",
          undefined,
          { months: funding.runwayMonths.toFixed(1) }
        )
      );
    } else if (funding.runwayMonths < 12) {
      warnings.push(
        insight(
          "Runway is under a year.",
          "{months} months of runway leaves limited room to iterate before raising or reaching break-even.",
          undefined,
          { months: funding.runwayMonths.toFixed(1) }
        )
      );
    } else {
      strengths.push(
        insight("Runway provides a healthy buffer.", "{months} months at the current burn rate.", undefined, {
          months: funding.runwayMonths.toFixed(1),
        })
      );
    }
  }

  // --- Gross margin --------------------------------------------------
  const marginScore = interpolateScore(unitEconomics.grossMarginPct, benchmarks.grossMarginPct);
  if (marginScore < 45) {
    warnings.push(
      insight(
        "Gross margin is below the benchmark for this business model.",
        "Current gross margin is {pct}%. Consider reducing variable costs or increasing price.",
        undefined,
        { pct: unitEconomics.grossMarginPct.toFixed(1) }
      )
    );
  } else if (marginScore >= 85) {
    strengths.push(
      insight("Gross margin is strong for this business model.", "{pct}% gross margin.", undefined, {
        pct: unitEconomics.grossMarginPct.toFixed(1),
      })
    );
  }

  // --- CAC payback -----------------------------------------------------
  if (unitEconomics.cacPaybackMonths !== null) {
    if (unitEconomics.cacPaybackMonths > 18) {
      warnings.push(
        insight(
          "CAC payback period is long.",
          "It takes {months} months of gross profit to recover acquisition cost.",
          undefined,
          { months: unitEconomics.cacPaybackMonths.toFixed(1) }
        )
      );
    } else if (unitEconomics.cacPaybackMonths <= 6) {
      strengths.push(
        insight("CAC payback is fast.", "Acquisition cost is recovered in {months} months.", undefined, {
          months: unitEconomics.cacPaybackMonths.toFixed(1),
        })
      );
    }
  }

  // --- Market penetration -----------------------------------------------
  if (market.requiredMarketPenetrationPct > 20) {
    warnings.push(
      insight(
        "Required market penetration looks unrealistic.",
        "Hitting your target requires capturing {pct}% of the addressable market.",
        undefined,
        { pct: market.requiredMarketPenetrationPct.toFixed(1) }
      )
    );
  } else if (market.requiredMarketPenetrationPct > 0 && market.requiredMarketPenetrationPct < 3) {
    strengths.push(
      insight(
        "Required market penetration is modest.",
        "Your target only requires {pct}% of the addressable market.",
        undefined,
        { pct: market.requiredMarketPenetrationPct.toFixed(2) }
      )
    );
  }

  // --- Break-even reachability -------------------------------------------
  if (breakEven.breakEvenCustomers === null && breakEven.contributionMarginPerCustomer <= 0) {
    criticalRisks.push(
      insight(
        "Break-even is currently mathematically unreachable.",
        "Contribution margin per customer is zero or negative — each additional customer loses money before fixed costs are even considered."
      )
    );
  } else if (breakEven.remainingCustomersToBreakEven === 0) {
    strengths.push(insight("The business has already reached break-even at the current customer count."));
  }

  // --- Churn ---------------------------------------------------------
  const churnScore = interpolateScore(retention.monthlyChurnPct, benchmarks.monthlyChurnPct);
  if (churnScore < 40) {
    warnings.push(
      insight(
        "Monthly churn is high relative to the benchmark for this business model.",
        "{pct}% monthly churn shortens customer lifetime and depresses LTV.",
        undefined,
        { pct: retention.monthlyChurnPct.toFixed(1) }
      )
    );
  }

  // --- Competition ---------------------------------------------------
  if (project.validation.competitionIntensity >= 4 && project.validation.differentiationStrength <= 2) {
    criticalRisks.push(
      insight(
        "High competition intensity combined with weak differentiation.",
        "Customers currently have little reason to choose this product over existing alternatives."
      )
    );
  }

  // --- Validation evidence -----------------------------------------------
  if (scores.categories.validation.score < 40) {
    warnings.push(
      insight(
        "Validation evidence is currently weak.",
        "Few customer interviews, users, paying customers, or signed commitments have been recorded."
      )
    );
  }

  // --- Founder commitment -------------------------------------------
  if (project.team.founderCommitment <= 2) {
    warnings.push(insight("Founder commitment is rated low.", "This is one of the highest-weighted execution factors."));
  }

  // --- Conversion funnel -------------------------------------------------
  if (acquisition.leadToCustomerConversionPct !== null && acquisition.leadToCustomerConversionPct < 2) {
    opportunities.push(
      insight(
        "Lead-to-customer conversion is low.",
        "{pct}% of leads convert — improving funnel conversion may be cheaper than acquiring more leads.",
        undefined,
        { pct: acquisition.leadToCustomerConversionPct.toFixed(1) }
      )
    );
  }

  if (operating.isCashFlowPositive === false && funding.runwayMonths !== null && funding.runwayMonths > 24) {
    opportunities.push(insight("Runway is long enough to iterate on the model before fundraising pressure sets in."));
  }

  // --- Recommended actions, derived from the weakest score categories -----
  const weakestCategories = Object.values(scores.categories)
    .slice()
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  for (const category of weakestCategories) {
    if (category.score >= 65) continue; // category isn't actually a weak point
    switch (category.category) {
      case "validation":
        recommendedActions.push(insight("Interview 10 potential customers to strengthen problem validation."));
        recommendedActions.push(insight("Acquire your first 5 paying customers before expanding development."));
        break;
      case "unitEconomics":
        recommendedActions.push(
          metrics.acquisition.cac === null
            ? insight("Acquisition spend isn't converting into customers yet — fix the funnel before scaling spend further.")
            : insight("Reduce CAC below ${amount} or improve gross margin to strengthen unit economics.", undefined, {
                amount: Math.max(1, Math.round(metrics.acquisition.cac * 0.7)).toLocaleString(),
              })
        );
        break;
      case "financial":
        recommendedActions.push(insight("Reduce fixed costs or extend runway before scaling acquisition spend."));
        break;
      case "market":
        recommendedActions.push(insight("Test willingness to pay at your current price point with a small sample of prospects."));
        break;
      case "execution":
        recommendedActions.push(insight("Identify a distribution channel or partnership before increasing build scope."));
        break;
      case "risk":
        recommendedActions.push(insight("Document mitigation plans for the highest-rated risk factors."));
        break;
    }
  }

  if (retention.monthlyChurnPct > 0) {
    const targetChurn = Math.max(0.5, retention.monthlyChurnPct * 0.6);
    if (churnScore < 60) {
      recommendedActions.push(
        insight("Validate churn below {target}% before scaling acquisition spend.", undefined, {
          target: targetChurn.toFixed(1),
        })
      );
    }
  }

  recommendedActions.push(insight("Test a landing page before building the full product, if you haven't already."));

  return {
    strengths,
    warnings,
    criticalRisks,
    opportunities,
    recommendedActions: dedupe(recommendedActions).slice(0, 8),
  };
}

function dedupe(items: Insight[]): Insight[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    if (seen.has(i.message)) return false;
    seen.add(i.message);
    return true;
  });
}
