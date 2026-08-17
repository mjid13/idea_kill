import type { CalculatedMetrics, Insight, InsightReport, Project, ScoreBreakdown } from "@/types";
import { getBenchmarks } from "@/lib/scoring/benchmarks";
import { interpolateScore } from "@/lib/scoring/interpolate";
import { detectContradictions } from "./contradictions";

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
          "Our customer economics appear healthy based on the current assumptions.",
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
        "Hitting our target requires capturing {pct}% of the addressable market.",
        undefined,
        { pct: market.requiredMarketPenetrationPct.toFixed(1) }
      )
    );
  } else if (market.requiredMarketPenetrationPct > 0 && market.requiredMarketPenetrationPct < 3) {
    strengths.push(
      insight(
        "Required market penetration is modest.",
        "Our target only requires {pct}% of the addressable market.",
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

  // --- Dilution & valuation -----------------------------------------------
  const { dilution } = metrics;
  if (dilution.equityGivenUpPct !== null) {
    if (dilution.equityGivenUpPct > 40) {
      criticalRisks.push(
        insight(
          "This round gives up an unusually large equity stake.",
          "Giving up {pct}% in a single round is high — it can leave too little equity for future rounds and key hires.",
          undefined,
          { pct: dilution.equityGivenUpPct.toFixed(1) }
        )
      );
    } else if (dilution.equityGivenUpPct > 25) {
      warnings.push(
        insight(
          "This round's dilution is on the higher side.",
          "Giving up {pct}% of the company in this round is above the typical range for an early round.",
          undefined,
          { pct: dilution.equityGivenUpPct.toFixed(1) }
        )
      );
    } else if (dilution.equityGivenUpPct < 15) {
      strengths.push(
        insight("This round preserves most of our ownership.", "Only {pct}% equity given up at the modeled valuation.", undefined, {
          pct: dilution.equityGivenUpPct.toFixed(1),
        })
      );
    }
  }

  // --- Hybrid revenue mix ---------------------------------------------------
  // A stack of streams is a strength when the recurring half carries the
  // business and a risk when the revenue is really one-time project work
  // wearing a product's clothes.
  if (metrics.revenueMix !== null && metrics.revenueMix.streams.length > 1) {
    const mix = metrics.revenueMix;
    if (mix.recurringRevenueSharePct < 40) {
      warnings.push(
        insight(
          "Most revenue has to be re-sold every month.",
          "Only {pct}% of revenue recurs — the rest depends on winning new one-time work, so revenue restarts from near zero if sales pause.",
          undefined,
          { pct: mix.recurringRevenueSharePct.toFixed(0) }
        )
      );
    } else if (mix.recurringRevenueSharePct >= 70) {
      strengths.push(
        insight(
          "The revenue base is mostly recurring.",
          "{pct}% of revenue arrives again next month without new sales.",
          undefined,
          { pct: mix.recurringRevenueSharePct.toFixed(0) }
        )
      );
    }

    const lowMarginStream = [...mix.streams]
      .filter((s) => s.revenueSharePct >= 20)
      .sort((a, b) => a.grossMarginPct - b.grossMarginPct)[0];
    if (lowMarginStream && lowMarginStream.grossMarginPct < 40) {
      opportunities.push(
        insight(
          "One stream is pulling the blended margin down.",
          "{name} runs at a {margin}% margin on {share}% of revenue. Productizing or repricing it lifts the whole blend.",
          undefined,
          {
            name: lowMarginStream.name || "Untitled stream",
            margin: lowMarginStream.grossMarginPct.toFixed(0),
            share: lowMarginStream.revenueSharePct.toFixed(0),
          }
        )
      );
    }

    if (unitEconomics.oneTimeGrossProfitPerCustomer > 0 && unitEconomics.cacPaybackMonths === 0) {
      strengths.push(
        insight(
          "Upfront work pays for customer acquisition on day one.",
          "One-time streams contribute {amount} of margin per new customer, more than the cost of acquiring them.",
          undefined,
          { amount: unitEconomics.oneTimeGrossProfitPerCustomer.toFixed(0) }
        )
      );
    }
  }

  // --- Marketplace take rate -----------------------------------------------
  if (metrics.marketplace !== null) {
    const takeRateScore = interpolateScore(metrics.marketplace.takeRatePct, benchmarks.grossMarginPct);
    if (takeRateScore < 45) {
      warnings.push(
        insight(
          "Take rate is below the typical range for marketplaces.",
          "A {pct}% take rate leaves thin margin to cover acquisition and operating costs.",
          undefined,
          { pct: metrics.marketplace.takeRatePct.toFixed(1) }
        )
      );
    } else if (takeRateScore >= 85) {
      strengths.push(
        insight("Take rate is strong for a marketplace.", "{pct}% take rate on GMV.", undefined, {
          pct: metrics.marketplace.takeRatePct.toFixed(1),
        })
      );
    }
  }

  // --- Net revenue retention -----------------------------------------------
  const hasExpansionData =
    (project.retention.monthlyExpansionRevenuePct && project.retention.monthlyExpansionRevenuePct.quality !== "unknown") ||
    (project.retention.monthlyContractionRevenuePct && project.retention.monthlyContractionRevenuePct.quality !== "unknown");
  if (hasExpansionData) {
    const nrr = retention.netRevenueRetentionPct;
    if (nrr < 90) {
      warnings.push(
        insight(
          "Net revenue retention is below a healthy level.",
          "At {pct}% annualized NRR, the existing customer base is shrinking in revenue terms even before new sales.",
          undefined,
          { pct: nrr.toFixed(0) }
        )
      );
    } else if (nrr > 120) {
      opportunities.push(
        insight(
          "Net revenue retention is best-in-class.",
          "{pct}% annualized NRR — double check the expansion/contraction inputs aren't overstated.",
          undefined,
          { pct: nrr.toFixed(0) }
        )
      );
    } else if (nrr > 100) {
      strengths.push(
        insight("Existing customers are growing revenue on their own.", "{pct}% annualized net revenue retention.", undefined, {
          pct: nrr.toFixed(0),
        })
      );
    }
  }

  // --- Customer concentration -----------------------------------------------
  if (project.pricing.topCustomersRevenueSharePct && project.pricing.topCustomersRevenueSharePct.quality !== "unknown") {
    const { concentration } = metrics;
    if (concentration.riskLevel === "severe") {
      criticalRisks.push(
        insight(
          "Revenue is heavily concentrated in a few customers.",
          "Our largest customers account for {pct}% of revenue — losing one could be existential.",
          undefined,
          { pct: concentration.topCustomersRevenueSharePct.toFixed(0) }
        )
      );
    } else if (concentration.riskLevel === "high") {
      warnings.push(
        insight(
          "Customer concentration is a meaningful risk.",
          "Our largest customers account for {pct}% of revenue.",
          undefined,
          { pct: concentration.topCustomersRevenueSharePct.toFixed(0) }
        )
      );
    } else if (concentration.riskLevel === "low") {
      strengths.push(
        insight("Revenue is well diversified across customers.", "Top customers account for only {pct}% of revenue.", undefined, {
          pct: concentration.topCustomersRevenueSharePct.toFixed(0),
        })
      );
    }
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
        recommendedActions.push(insight("Acquire our first 5 paying customers before expanding development."));
        break;
      case "unitEconomics":
        recommendedActions.push(
          metrics.acquisition.cac === null
            ? insight("Acquisition spend isn't converting into customers yet — fix the funnel before scaling spend further.")
            : insight("Reduce CAC below {currency} {amount, number} or improve gross margin to strengthen unit economics.", undefined, {
                currency: project.basicInfo.currency,
                amount: Math.max(1, Math.round(metrics.acquisition.cac * 0.7)),
              })
        );
        break;
      case "financial":
        recommendedActions.push(insight("Reduce fixed costs or extend runway before scaling acquisition spend."));
        break;
      case "market":
        recommendedActions.push(insight("Test willingness to pay at our current price point with a small sample of prospects."));
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

  recommendedActions.push(insight("Test a landing page before building the full product, if we haven't already."));

  return {
    contradictions: detectContradictions(project, metrics),
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
