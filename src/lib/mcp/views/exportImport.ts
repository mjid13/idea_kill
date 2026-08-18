// Only the pure builders are imported: their `download*` siblings in the same
// module touch the DOM, but they do so inside function bodies, so importing by
// name keeps this server-safe.
import { buildExportBundle, buildExportCsv } from "@/lib/export/exportData";
import { parseImportBundle } from "@/lib/export/importData";
import { calculateMetrics, forecastProject, generateScenarios } from "@/lib/calculations";
import { calculateScoreBreakdown } from "@/lib/scoring";
import { generateInsights } from "@/lib/insights";
import type { Project } from "@/types";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
}

export function exportView(project: Project, format: "json" | "csv") {
  const metrics = calculateMetrics(project);
  const scores = calculateScoreBreakdown(project, metrics);
  const bundle = buildExportBundle(
    project, metrics, scores, generateInsights(metrics, scores, project), generateScenarios(project, metrics),
  );
  const filename = `${slugify(project.basicInfo.name)}-data.${format}`;
  return format === "csv"
    ? { format, filename, csv: buildExportCsv(bundle) }
    : { format, filename, bundle };
}

export { parseImportBundle, forecastProject };
