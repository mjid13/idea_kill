import type { CategoryScore, ScoreCategory, ScoreBreakdown } from "@/types";

export type HealthStatus = "Strong" | "Healthy" | "Weak" | "Risky";

export function scoreToHealth(score: number): HealthStatus {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Healthy";
  if (score >= 40) return "Weak";
  return "Risky";
}

export const HEALTH_TEXT_COLOR: Record<HealthStatus, string> = {
  Strong: "text-emerald-600 dark:text-emerald-400",
  Healthy: "text-emerald-600 dark:text-emerald-400",
  Weak: "text-amber-600 dark:text-amber-400",
  Risky: "text-red-600 dark:text-red-400",
};

export const HEALTH_BAR_COLOR: Record<HealthStatus, string> = {
  Strong: "bg-emerald-500",
  Healthy: "bg-emerald-500",
  Weak: "bg-amber-500",
  Risky: "bg-red-500",
};

/** Finds a specific sub-factor's score within a category, used to derive per-metric health badges on the dashboard. */
export function findFactorScore(scores: ScoreBreakdown, category: ScoreCategory, labelIncludes: string): number | null {
  const factor = scores.categories[category].factors.find((f) => f.label.toLowerCase().includes(labelIncludes.toLowerCase()));
  return factor ? factor.score : null;
}

export function categoryHealth(category: CategoryScore): HealthStatus {
  return scoreToHealth(category.score);
}
