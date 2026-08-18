import { calculateMetrics } from "@/lib/calculations";
import { getBenchmarks } from "@/lib/scoring/benchmarks";
import type { BusinessModel, Project } from "@/types";

/**
 * Benchmarks plus, when a project is named, the project's own figures on the
 * same axes — deliberately without a verdict. The scoring engine already judges
 * these; a second opinion computed here could disagree with the score in the
 * same conversation.
 */
export function benchmarksView(businessModel: BusinessModel, project?: Project) {
  const anchors = getBenchmarks(businessModel);
  if (!project) return { businessModel, benchmarks: anchors };
  const metrics = calculateMetrics(project);
  return {
    businessModel,
    benchmarks: anchors,
    actuals: {
      grossMarginPct: metrics.unitEconomics.grossMarginPct,
      ltvToCac: metrics.unitEconomics.ltvToCacRatio,
      cacPaybackMonths: metrics.unitEconomics.cacPaybackMonths,
      monthlyChurnPct: metrics.retention.monthlyChurnPct,
      netRevenueRetentionPct: metrics.retention.netRevenueRetentionPct,
    },
  };
}
