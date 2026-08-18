import { collectRangedFields, runMonteCarlo } from "@/lib/calculations";
import { findMissingAssumptions } from "@/lib/projects/analysis";
import type { Project } from "@/types";
import { publicMcpPath } from "../paths";

export interface MonteCarloOptionsInput { iterations: number; months: 12 | 24 | 36; seed?: number }

/**
 * `collectRangedFields` and the simulation's own `rangedFields` speak internal
 * field paths; every path leaving the MCP boundary has to be the public one a
 * client could write back through `update_project`.
 */
export function monteCarloView(project: Project, options: MonteCarloOptionsInput) {
  const result = runMonteCarlo(project, options);
  if (!result) {
    // A dead end is only useful if it names the next move, so the empty case
    // carries the candidate assumptions and the exact write that enables it.
    const candidates = findMissingAssumptions(project, undefined, true)
      .slice(0, 20)
      .map((assumption) => publicMcpPath(assumption.path));
    return {
      available: false as const,
      reason: "No assumption carries a low/high range, so there is nothing to sample.",
      rangedAssumptionCount: 0,
      candidates,
      howTo: "Call update_project with <path>.range.low and <path>.range.high (keeping .value as the most likely point between them), for example pricing.productPrice.range.low.",
    };
  }
  return {
    available: true as const,
    seed: options.seed ?? null,
    ...result,
    rangedFields: result.rangedFields.map((field) => ({ ...field, path: publicMcpPath(field.path) })),
    rangedAssumptions: collectRangedFields(project).map((field) => publicMcpPath(field.path)),
  };
}
