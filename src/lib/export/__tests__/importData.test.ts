import { describe, expect, it } from "vitest";
import { parseImportBundle, ImportError } from "../importData";
import { buildExportBundle } from "../exportData";
import { calculateMetrics, generateScenarios } from "@/lib/calculations";
import { calculateScoreBreakdown } from "@/lib/scoring";
import { generateInsights } from "@/lib/insights";
import { exampleProject } from "@/lib/example";
import { known, type Project } from "@/types";

function exportedJson() {
  const metrics = calculateMetrics(exampleProject);
  const scores = calculateScoreBreakdown(exampleProject, metrics);
  const insights = generateInsights(metrics, scores, exampleProject);
  const scenarios = generateScenarios(exampleProject, metrics);
  const bundle = buildExportBundle(exampleProject, metrics, scores, insights, scenarios);
  return JSON.stringify(bundle);
}

describe("parseImportBundle", () => {
  it("round-trips every assumption field from an exported project", () => {
    const project = parseImportBundle(exportedJson());
    expect(project.basicInfo.name).toBe(exampleProject.basicInfo.name);
    expect(project.market.totalPotentialCustomers).toEqual(exampleProject.market.totalPotentialCustomers);
    expect(project.pricing.productPrice).toEqual(exampleProject.pricing.productPrice);
    expect(project.pitch).toEqual(exampleProject.pitch);
  });

  it("round-trips a marketplace project's new optional slice and fields", () => {
    const marketplaceProject: Project = {
      ...exampleProject,
      basicInfo: { ...exampleProject.basicInfo, businessModel: "marketplace" },
      marketplace: {
        averageOrderValue: known(40),
        takeRatePct: known(20),
        transactionsPerCustomerPerMonth: known(2),
      },
      funding: { ...exampleProject.funding, preMoneyValuation: known(2000000) },
      retention: { ...exampleProject.retention, monthlyExpansionRevenuePct: known(4) },
      pricing: { ...exampleProject.pricing, topCustomersRevenueSharePct: known(15) },
    };
    const metrics = calculateMetrics(marketplaceProject);
    const scores = calculateScoreBreakdown(marketplaceProject, metrics);
    const insights = generateInsights(metrics, scores, marketplaceProject);
    const scenarios = generateScenarios(marketplaceProject, metrics);
    const bundle = buildExportBundle(marketplaceProject, metrics, scores, insights, scenarios);

    const imported = parseImportBundle(JSON.stringify(bundle));
    expect(imported.marketplace).toEqual(marketplaceProject.marketplace);
    expect(imported.funding.preMoneyValuation).toEqual(known(2000000));
    expect(imported.retention.monthlyExpansionRevenuePct).toEqual(known(4));
    expect(imported.pricing.topCustomersRevenueSharePct).toEqual(known(15));
  });

  it("assigns a fresh id rather than reusing the exported one, so importing never collides with an existing project", () => {
    const project = parseImportBundle(exportedJson());
    expect(project.id).not.toBe(exampleProject.id);
    expect(project.id.length).toBeGreaterThan(0);
  });

  it("stamps fresh createdAt/updatedAt timestamps rather than reusing the exported ones", () => {
    const project = parseImportBundle(exportedJson());
    expect(project.createdAt).not.toBe(exampleProject.createdAt);
    expect(project.updatedAt).not.toBe(exampleProject.updatedAt);
    expect(() => new Date(project.createdAt).toISOString()).not.toThrow();
  });

  it("rejects input that isn't valid JSON", () => {
    expect(() => parseImportBundle("not json")).toThrow(ImportError);
  });

  it("rejects JSON that doesn't contain a project field", () => {
    expect(() => parseImportBundle(JSON.stringify({ exportedAt: "2026-01-01" }))).toThrow(ImportError);
  });

  it("rejects a project missing required assumption fields", () => {
    const bundle = JSON.parse(exportedJson());
    delete bundle.project.market;
    expect(() => parseImportBundle(JSON.stringify(bundle))).toThrow(ImportError);
  });

  it("rejects a project with an invalid business model", () => {
    const bundle = JSON.parse(exportedJson());
    bundle.project.basicInfo.businessModel = "not-a-real-model";
    expect(() => parseImportBundle(JSON.stringify(bundle))).toThrow(ImportError);
  });

  it("ignores extraneous top-level fields (calculatedMetrics, scoreBreakdown, etc.) without error", () => {
    // The full ExportBundle carries recomputable derived data alongside `project` —
    // import only trusts the raw assumptions and recalculates everything else.
    expect(() => parseImportBundle(exportedJson())).not.toThrow();
  });
});
