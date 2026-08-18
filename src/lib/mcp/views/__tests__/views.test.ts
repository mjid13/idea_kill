import { describe, expect, it } from "vitest";
import { createEmptyProject } from "@/lib/storage/factory";
import { exampleProject } from "@/lib/example";
import { applyProjectChanges } from "@/lib/projects/mutations";
import type { Project } from "@/types";
import { documentsView } from "../documents";
import { investorView } from "../investor";
import { lenderView } from "../lender";
import { monteCarloView } from "../monteCarlo";
import { suggestionsView } from "../suggestions";
import { writablePathsView } from "../writablePaths";
import { scenarioView } from "../scenario";
import { exportView } from "../exportImport";
import { parseImportBundle } from "@/lib/export/importData";
import { normalizeMcpPath } from "../../paths";

/**
 * Projects read through the repository are backfilled with empty documents
 * (codec.projectFromRow), which the raw fixture does not carry — so anything
 * asserting on document fields has to start from a backfilled project.
 */
function fixtureWithDocuments(): Project {
  return { ...createEmptyProject(), ...exampleProject };
}

function emptyProject(): Project {
  const project = createEmptyProject();
  project.basicInfo.name = "Test";
  return project;
}

/** Audience checks carry translation keys with params; a leaked `{months}` is the failure mode. */
const PLACEHOLDER = /\{\w+/;

describe("monteCarloView", () => {
  it("explains what to do when nothing carries a range", () => {
    const view = monteCarloView(emptyProject(), { iterations: 200, months: 24 });
    if (view.available) expect.unreachable("an empty project has no ranged assumptions");
    expect(view.candidates.length).toBeGreaterThan(0);
    expect(view.howTo).toMatch(/range\.low/);
  });

  it("is deterministic for a seed and reports public paths", () => {
    const options = { iterations: 200, months: 24 as const, seed: 42 };
    const first = monteCarloView(exampleProject, options);
    const second = monteCarloView(exampleProject, options);
    if (!first.available || !second.available) expect.unreachable("the fixture carries ranged assumptions");
    expect(first.revenue).toEqual(second.revenue);
    for (const field of first.rangedFields) expect(field.path).not.toMatch(/unitEconomics|onePager/);
  });
});

describe("audience views", () => {
  it("leaves no untranslated placeholder in lender checks", () => {
    const view = lenderView(exampleProject, { includeSchedule: false, scheduleMonths: 60 });
    expect(view.checks.length).toBeGreaterThan(0);
    for (const check of view.checks) expect(check.detail ?? "").not.toMatch(PLACEHOLDER);
    expect(view).not.toHaveProperty("schedule");
  });

  it("truncates the repayment schedule when asked for it", () => {
    const view = lenderView(exampleProject, { includeSchedule: true, scheduleMonths: 3 });
    expect(view.schedule?.length).toBeLessThanOrEqual(3);
  });

  it("leaves no untranslated placeholder in investor checks", () => {
    const view = investorView(exampleProject);
    expect(view.checks.length).toBeGreaterThan(0);
    for (const check of view.checks) expect(check.detail ?? "").not.toMatch(PLACEHOLDER);
    expect(view.summary).toHaveProperty("fundingAskIsDerived");
  });
});

describe("documentsView", () => {
  it("reports every document with a filled/total ratio", () => {
    const view = documentsView(emptyProject());
    expect(view.documents).toHaveLength(10);
    const financial = view.documents.find((document) => document.slug === "financial-model")!;
    expect(financial.status).toBe("complete");
    expect(financial.section).toBeNull();
    expect(financial.editable).toBe(false);
  });

  it("counts partially filled documents", () => {
    const project = emptyProject();
    project.icp = { customerProfile: "SMB", buyerDecisionMaker: "Owner", painPoints: "Manual work" };
    const icp = documentsView(project).documents.find((document) => document.slug === "icp")!;
    expect(icp).toMatchObject({ status: "in_progress", filled: 3, total: 5 });
  });
});

describe("writablePathsView", () => {
  it("covers the sections that only MCP can write", () => {
    const paths = writablePathsView(emptyProject(), { includeValues: false, limit: 2000 }).paths.map((row) => row.path);
    expect(paths).toContain("marketplace.takeRatePct.value");
    expect(paths).toContain("debt.loanAmount.value");
    expect(paths).not.toContain("id");
    expect(paths).not.toContain("revision");
  });

  it("flags truncation instead of silently dropping paths", () => {
    const view = writablePathsView(emptyProject(), { includeValues: false, limit: 5 });
    expect(view.paths).toHaveLength(5);
    expect(view.truncated).toBe(true);
  });

  it("addresses a revenue stream field by id", () => {
    const project = emptyProject();
    project.revenueStreams = [{
      id: "rs_1", name: "Audit", kind: "one_time", price: { value: 0, quality: "unknown" },
      billingPeriod: "one_time", attachRatePct: { value: 100, quality: "estimated" },
      unitsPerCustomerPerMonth: { value: 1, quality: "estimated" }, deliveryCostPct: { value: 0, quality: "unknown" },
    }];
    const paths = writablePathsView(project, { includeValues: false, limit: 2000 }).paths.map((row) => row.path);
    expect(paths).toContain("revenue_streams[rs_1].price.value");
  });
});

describe("suggestionsView", () => {
  it("returns paths the mutation layer actually accepts", () => {
    const project = fixtureWithDocuments();
    for (const document of ["icp", "gtm-plan", "sales-docs", "contract-terms", "pilot-report", "validation-plan"] as const) {
      for (const suggestion of suggestionsView(project, document).suggestions) {
        if (!suggestion.apply || suggestion.apply.tool !== "update_project") continue;
        expect(() => applyProjectChanges(project, [{
          path: normalizeMcpPath(suggestion.apply!.path), value: suggestion.apply!.value,
        }]), suggestion.apply.path).not.toThrow();
      }
    }
  });

  it("resolves the interview-question template instead of leaking it", () => {
    const suggestions = suggestionsView(fixtureWithDocuments(), "validation-plan").suggestions;
    for (const suggestion of suggestions) expect(String(suggestion.value)).not.toMatch(PLACEHOLDER);
  });
});

describe("scenarioView", () => {
  it("applies multipliers on their own", () => {
    const baseline = scenarioView(exampleProject, { horizon: 12, multipliers: {} });
    const cheaper = scenarioView(exampleProject, { horizon: 12, multipliers: { price: 1.2 } });
    expect(cheaper.scenario.metrics.revenue.mrr).toBeGreaterThan(baseline.scenario.metrics.revenue.mrr);
    expect(cheaper.appliedMultipliers).toEqual({ price: 1.2, cac: 1, churn: 1, growth: 1 });
  });
});

describe("exportView", () => {
  it("round-trips through the import parser", () => {
    const exported = exportView(exampleProject, "json") as { bundle: unknown };
    const reimported = parseImportBundle(JSON.stringify(exported.bundle));
    expect(reimported.basicInfo.name).toBe(exampleProject.basicInfo.name);
  });

  it("produces a CSV with content", () => {
    const exported = exportView(exampleProject, "csv") as { csv: string };
    expect(exported.csv.split("\n")[0]).toBeTruthy();
  });
});
