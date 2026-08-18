import { calculateEfficiencyMetrics, calculateFundingRequirement, calculateMetrics, forecastProject } from "@/lib/calculations";
import { getBenchmarks } from "@/lib/scoring/benchmarks";
import type { Project } from "@/types";

/** Efficiency ratios read a 12-month projection and go all-null on a shorter one. */
const EFFICIENCY_HORIZON = 12;

/**
 * The Financial Model document has no stored fields — it is entirely derived —
 * so this is its canonical read surface, mirroring what
 * /project/[id]/financial-model renders.
 */
export function financialModelView(project: Project) {
  const metrics = calculateMetrics(project);
  const forecast = forecastProject(project, metrics, EFFICIENCY_HORIZON);
  return {
    metrics,
    fundingRequirement: calculateFundingRequirement(project, metrics),
    efficiency: calculateEfficiencyMetrics(project, metrics, forecast),
    benchmarks: getBenchmarks(project.basicInfo.businessModel),
  };
}
