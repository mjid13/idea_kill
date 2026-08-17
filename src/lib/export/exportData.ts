import type { Assumption, CalculatedMetrics, InsightReport, Project, ScenarioResult, ScoreBreakdown } from "@/types";

/** Triggers a client-side file download of in-memory content. No network call, nothing leaves the browser. */
export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "project";
}

export interface ExportBundle {
  exportedAt: string;
  project: Project;
  calculatedMetrics: CalculatedMetrics;
  scoreBreakdown: ScoreBreakdown;
  insights: InsightReport;
  scenarios: ScenarioResult["scenarios"];
}

/** Full backup/interchange bundle: every raw input plus every derived output, machine-readable. */
export function buildExportBundle(
  project: Project,
  metrics: CalculatedMetrics,
  scores: ScoreBreakdown,
  insights: InsightReport,
  scenarios: ScenarioResult
): ExportBundle {
  return {
    exportedAt: new Date().toISOString(),
    project,
    calculatedMetrics: metrics,
    scoreBreakdown: scores,
    insights,
    scenarios: scenarios.scenarios,
  };
}

export function downloadProjectJson(bundle: ExportBundle): void {
  downloadFile(`${slugify(bundle.project.basicInfo.name)}-data.json`, JSON.stringify(bundle, null, 2), "application/json");
}

// ---------------------------------------------------------------------------
// CSV — flattened, spreadsheet-friendly view of the same bundle.
// ---------------------------------------------------------------------------

// Low/High are only filled for assumptions entered as a range; every other row
// leaves them off and they are padded out when the CSV is assembled.
type Row = [section: string, field: string, value: string, quality: string, low?: string, high?: string];

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function toCsv(rows: Row[]): string {
  // "Value" is the single number, or the most likely point when Low/High are filled.
  const header: Row = ["Section", "Field", "Value", "Data quality", "Low", "High"];
  const width = header.length;
  return [header, ...rows]
    .map((r) => Array.from({ length: width }, (_, i) => csvEscape(r[i] ?? "")).join(","))
    .join("\n");
}

function isAssumption(v: unknown): v is Assumption<number> {
  return typeof v === "object" && v !== null && "value" in v && "quality" in v;
}

/** Flattens a plain object of Assumption<number>/primitive fields into CSV rows, splitting camelCase labels. */
function flattenInputs(section: string, obj: object): Row[] {
  const rows: Row[] = [];
  for (const [key, raw] of Object.entries(obj)) {
    if (raw === undefined) continue;
    const label = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
    if (isAssumption(raw)) {
      const range = raw.range;
      rows.push([section, label, String(raw.value), raw.quality, range ? String(range.low) : "", range ? String(range.high) : ""]);
    } else if (typeof raw === "number" || typeof raw === "string" || typeof raw === "boolean") {
      rows.push([section, label, String(raw), ""]);
    }
  }
  return rows;
}

function flattenOutputs(section: string, obj: object): Row[] {
  const rows: Row[] = [];
  for (const [key, raw] of Object.entries(obj)) {
    if (raw === null || raw === undefined) continue;
    const label = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
    if (typeof raw === "number" || typeof raw === "string" || typeof raw === "boolean") {
      rows.push([section, label, String(raw), ""]);
    }
  }
  return rows;
}

export function buildExportCsv(bundle: ExportBundle): string {
  const { project, calculatedMetrics, scoreBreakdown, scenarios } = bundle;
  const rows: Row[] = [
    ["Basic info", "Name", project.basicInfo.name, ""],
    ["Basic info", "Description", project.basicInfo.description, ""],
    ["Basic info", "Business model", project.basicInfo.businessModel, ""],
    ["Basic info", "Currency", project.basicInfo.currency, ""],

    ...flattenInputs("Market (input)", project.market),
    ...flattenInputs("Pricing (input)", project.pricing),
    // Each revenue stream gets its own CSV section so a hybrid mix stays legible
    // in a spreadsheet instead of collapsing into one anonymous "streams" row.
    ...(project.revenueStreams ?? []).flatMap((stream, index) =>
      flattenInputs(`Revenue stream ${index + 1}: ${stream.name || "Untitled"} (input)`, stream)
    ),
    ...flattenInputs("Marketplace (input)", project.marketplace ?? {}),
    ...flattenInputs("Acquisition (input)", project.acquisition),
    ...flattenInputs("Retention (input)", project.retention),
    ...flattenInputs("Unit economics (input)", project.unitEconomics),
    ...flattenInputs("Operating costs (input)", project.costs),
    ...flattenInputs("Funding (input)", project.funding),
    ...flattenInputs("Validation ratings 1-5 (input)", project.validation),
    ...flattenInputs("Team ratings 1-5 (input)", project.team),
    ...flattenInputs("Risk ratings 1-5 (input)", project.risk),

    ...flattenOutputs("Market (calculated)", calculatedMetrics.market),
    ...flattenOutputs("Revenue (calculated)", calculatedMetrics.revenue),
    ...flattenOutputs("Acquisition (calculated)", calculatedMetrics.acquisition),
    ...flattenOutputs("Retention (calculated)", calculatedMetrics.retention),
    ...flattenOutputs("Unit economics (calculated)", calculatedMetrics.unitEconomics),
    ...flattenOutputs("Operating (calculated)", calculatedMetrics.operating),
    ...flattenOutputs("Funding (calculated)", calculatedMetrics.funding),
    ...flattenOutputs("Break-even (calculated)", calculatedMetrics.breakEven),
    ...flattenOutputs("Dilution (calculated)", calculatedMetrics.dilution),
    ...flattenOutputs("Concentration (calculated)", calculatedMetrics.concentration),
    ...flattenOutputs("Marketplace (calculated)", calculatedMetrics.marketplace ?? {}),
    ...(calculatedMetrics.revenueMix
      ? [
          ...flattenOutputs("Revenue mix (calculated)", calculatedMetrics.revenueMix),
          ...calculatedMetrics.revenueMix.streams.flatMap((stream) =>
            flattenOutputs(`Revenue stream: ${stream.name || "Untitled"} (calculated)`, stream)
          ),
        ]
      : []),

    ["Score", "Overall", String(scoreBreakdown.overall), ""],
    ["Score", "Confidence", String(scoreBreakdown.confidence), ""],
    ["Score", "Maturity stage", `${scoreBreakdown.maturityStage.stage} - ${scoreBreakdown.maturityStage.label}`, ""],
    ...Object.values(scoreBreakdown.categories).map(
      (c): Row => ["Score", c.label, String(c.score), `weight ${c.weight}`]
    ),

    ...(["conservative", "base", "optimistic"] as const).flatMap((name): Row[] => {
      const s = scenarios[name];
      return [
        [`Scenario - ${s.label}`, "Revenue (24mo)", String(s.revenue), ""],
        [`Scenario - ${s.label}`, "Customers (24mo)", String(s.customers), ""],
        [`Scenario - ${s.label}`, "Runway months", s.runwayMonths === null ? "" : String(s.runwayMonths), ""],
        [`Scenario - ${s.label}`, "Break-even month", s.breakEvenMonth === null ? "" : String(s.breakEvenMonth), ""],
      ];
    }),
  ];

  return toCsv(rows);
}

export function downloadProjectCsv(bundle: ExportBundle): void {
  downloadFile(`${slugify(bundle.project.basicInfo.name)}-data.csv`, buildExportCsv(bundle), "text/csv;charset=utf-8");
}
