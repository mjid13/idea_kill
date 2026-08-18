import { EXAMPLE_PROJECT_ID, exampleProject } from "@/lib/example";
import { analyzeProject } from "@/lib/projects/analysis";
import { projectData } from "@/lib/projects/codec";

/**
 * A complete, ranged, realistic project a client can read before it has been
 * granted anything — the cheapest way to learn the schema, including what a
 * low/high range looks like, without writing to real data.
 */
export function exampleView(includeAnalysis: boolean) {
  return {
    fixture: true,
    notice: "Reference fixture, not user data. It is not writable and does not exist in the database.",
    id: EXAMPLE_PROJECT_ID,
    assumptions: projectData(exampleProject),
    ...(includeAnalysis ? { analysis: analyzeProject(exampleProject, 24) } : {}),
  };
}
