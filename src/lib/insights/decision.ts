import type { CategoryScore, DecisionSummary, DecisionVerdict, ScoreBreakdown } from "@/types";

const VERDICT_COPY: Record<DecisionVerdict, { title: string; description: string }> = {
  explore_further: {
    title: "Explore Further",
    description: "The opportunity has potential but requires more evidence.",
  },
  validate_before_building: {
    title: "Validate Before Building",
    description: "Economics may work, but validation is currently weak.",
  },
  improve_economics: {
    title: "Improve Economics",
    description: "Demand may exist, but the current business model has weak unit economics.",
  },
  strong_candidate: {
    title: "Strong Candidate",
    description: "Current market, financial, and validation assumptions indicate a strong opportunity worth progressing.",
  },
  high_risk: {
    title: "High Risk",
    description: "Several critical assumptions currently make the opportunity unattractive.",
  },
};

/**
 * Chooses a verdict from the category breakdown rather than the overall
 * score alone — the same overall number can mean very different things
 * depending on which categories are driving it (spec section 25).
 */
export function generateDecisionSummary(scores: ScoreBreakdown): DecisionSummary {
  const c = scores.categories;
  const economicsScore = (c.unitEconomics.score + c.financial.score) / 2;
  const validationScore = c.validation.score;

  let verdict: DecisionVerdict;

  if (scores.overall < 40 || (economicsScore < 30 && c.risk.score < 40)) {
    verdict = "high_risk";
  } else if (economicsScore < 45) {
    verdict = "improve_economics";
  } else if (validationScore < 40 && economicsScore >= 50) {
    verdict = "validate_before_building";
  } else if (scores.overall >= 70 && validationScore >= 50 && scores.confidence >= 50) {
    verdict = "strong_candidate";
  } else {
    verdict = "explore_further";
  }

  const reasons = buildReasons(verdict, scores);
  const copy = VERDICT_COPY[verdict];

  return { verdict, title: copy.title, description: copy.description, reasons };
}

function buildReasons(verdict: DecisionVerdict, scores: ScoreBreakdown): string[] {
  const categories = Object.values(scores.categories);
  const sortedAscending = categories.slice().sort((a, b) => a.score - b.score);
  const sortedDescending = categories.slice().sort((a, b) => b.score - a.score);

  const describeWeak = (c: CategoryScore) => `${c.label} scores ${c.score}/100 — the weakest driver of this result.`;
  const describeStrong = (c: CategoryScore) => `${c.label} scores ${c.score}/100, a clear strength.`;

  switch (verdict) {
    case "strong_candidate":
      return sortedDescending.slice(0, 3).map(describeStrong);
    case "high_risk":
      return sortedAscending.slice(0, 3).map(describeWeak);
    case "improve_economics":
      return [
        `Unit economics score ${scores.categories.unitEconomics.score}/100.`,
        `Financial viability scores ${scores.categories.financial.score}/100.`,
        sortedAscending[0].category === "unitEconomics" || sortedAscending[0].category === "financial"
          ? describeWeak(sortedAscending[1])
          : describeWeak(sortedAscending[0]),
      ];
    case "validate_before_building":
      return [
        `Validation scores ${scores.categories.validation.score}/100, the weakest category.`,
        `Unit economics (${scores.categories.unitEconomics.score}/100) and financial viability (${scores.categories.financial.score}/100) look more promising.`,
        `Confidence is ${scores.confidence}% — more real-world evidence would materially change this result.`,
      ];
    case "explore_further":
    default:
      return sortedAscending.slice(0, 3).map((c) => `${c.label} scores ${c.score}/100 and has room to improve.`);
  }
}
