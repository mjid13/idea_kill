import { describe, expect, it } from "vitest";
import { buildExportBundle, buildExportCsv } from "../exportData";
import { calculateMetrics, generateScenarios } from "@/lib/calculations";
import { calculateScoreBreakdown } from "@/lib/scoring";
import { generateInsights } from "@/lib/insights";
import { exampleProject } from "@/lib/example";
import { known, type Project } from "@/types";

function buildBundle() {
  const metrics = calculateMetrics(exampleProject);
  const scores = calculateScoreBreakdown(exampleProject, metrics);
  const insights = generateInsights(metrics, scores, exampleProject);
  const scenarios = generateScenarios(exampleProject, metrics);
  return buildExportBundle(exampleProject, metrics, scores, insights, scenarios);
}

describe("buildExportBundle", () => {
  it("carries the project, metrics, scores, insights, and scenarios through untouched", () => {
    const bundle = buildBundle();
    expect(bundle.project).toBe(exampleProject);
    expect(bundle.scoreBreakdown.overall).toBeGreaterThanOrEqual(0);
    expect(bundle.calculatedMetrics.market.tam).toBeGreaterThan(0);
    expect(bundle.scenarios.base).toBeDefined();
    expect(bundle.scenarios.conservative).toBeDefined();
    expect(bundle.scenarios.optimistic).toBeDefined();
  });

  it("stamps an ISO exportedAt timestamp", () => {
    const bundle = buildBundle();
    expect(() => new Date(bundle.exportedAt).toISOString()).not.toThrow();
    expect(new Date(bundle.exportedAt).toISOString()).toBe(bundle.exportedAt);
  });
});

describe("buildExportCsv", () => {
  it("produces a header row followed by data rows", () => {
    const csv = buildExportCsv(buildBundle());
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Section,Field,Value,Data quality,Low,High");
    expect(lines.length).toBeGreaterThan(50); // every input + output + score row
  });

  it("writes the low/high bounds of a ranged assumption", () => {
    const project: Project = {
      ...exampleProject,
      pricing: { ...exampleProject.pricing, productPrice: { value: 4000, quality: "estimated", range: { low: 2500, high: 5000 } } },
    };
    const metrics = calculateMetrics(project);
    const scores = calculateScoreBreakdown(project, metrics);
    const csv = buildExportCsv(
      buildExportBundle(project, metrics, scores, generateInsights(metrics, scores, project), generateScenarios(project, metrics))
    );
    expect(csv).toContain("Product Price,4000,estimated,2500,5000");
  });

  it("includes basic info, known-quality inputs, and calculated outputs", () => {
    const csv = buildExportCsv(buildBundle());
    expect(csv).toContain("Basic info,Name,B2B SaaS — Example,");
    expect(csv).toContain("Market (input),Total Potential Customers,100000,known");
    expect(csv).toContain("Score,Overall,");
  });

  it("includes all three scenarios", () => {
    const csv = buildExportCsv(buildBundle());
    expect(csv).toContain("Scenario - Conservative");
    expect(csv).toContain("Scenario - Base");
    expect(csv).toContain("Scenario - Optimistic");
  });

  it("escapes fields containing commas, quotes, or newlines", () => {
    const projectWithSpecialChars = {
      ...exampleProject,
      basicInfo: { ...exampleProject.basicInfo, description: 'Handles "quotes", commas, and\nnewlines' },
    };
    const metrics = calculateMetrics(projectWithSpecialChars);
    const scores = calculateScoreBreakdown(projectWithSpecialChars, metrics);
    const insights = generateInsights(metrics, scores, projectWithSpecialChars);
    const scenarios = generateScenarios(projectWithSpecialChars, metrics);
    const bundle = buildExportBundle(projectWithSpecialChars, metrics, scores, insights, scenarios);
    const csv = buildExportCsv(bundle);
    expect(csv).toContain('"Handles ""quotes"", commas, and\nnewlines"');
  });

  it("includes dilution and concentration output rows, gracefully skipping unset marketplace fields", () => {
    const csv = buildExportCsv(buildBundle());
    // exampleProject never sets preMoneyValuation/topCustomersRevenueSharePct, so the
    // metrics are null/0 — dilution rows should be entirely absent (all-null object),
    // concentration should still show its 0%/low-risk default, and no literal "null"
    // or "marketplace" section should leak through for a non-marketplace project.
    expect(csv).toContain("Concentration (calculated),Top Customers Revenue Share Pct,0,");
    expect(csv).not.toContain("Marketplace (calculated)");
    expect(csv).not.toContain("null");
  });

  it("includes marketplace GMV/take-rate rows for a marketplace project", () => {
    const project: Project = {
      ...exampleProject,
      basicInfo: { ...exampleProject.basicInfo, businessModel: "marketplace" },
      marketplace: {
        averageOrderValue: known(40),
        takeRatePct: known(20),
        transactionsPerCustomerPerMonth: known(2),
      },
    };
    const metrics = calculateMetrics(project);
    const scores = calculateScoreBreakdown(project, metrics);
    const insights = generateInsights(metrics, scores, project);
    const scenarios = generateScenarios(project, metrics);
    const bundle = buildExportBundle(project, metrics, scores, insights, scenarios);
    const csv = buildExportCsv(bundle);
    expect(csv).toContain("Marketplace (input),Average Order Value,40,known");
    expect(csv).toContain("Marketplace (calculated),Gmv,");
    expect(csv).toContain("Marketplace (calculated),Take Rate Revenue,");
  });

  it("renders unreachable break-even as an empty field rather than the literal string null", () => {
    // Contribution margin <= 0 makes break-even mathematically unreachable (calculateBreakEvenMetrics
    // returns null) — the CSV must not print "null" for a spreadsheet consumer.
    const unreachableProject = {
      ...exampleProject,
      unitEconomics: {
        ...exampleProject.unitEconomics,
        directCostPerCustomer: { value: 10000, quality: "known" as const },
      },
    };
    const metrics = calculateMetrics(unreachableProject);
    expect(metrics.breakEven.breakEvenCustomers).toBeNull();
    const scores = calculateScoreBreakdown(unreachableProject, metrics);
    const insights = generateInsights(metrics, scores, unreachableProject);
    const scenarios = generateScenarios(unreachableProject, metrics);
    const bundle = buildExportBundle(unreachableProject, metrics, scores, insights, scenarios);
    const csv = buildExportCsv(bundle);
    expect(csv).not.toContain("null");
  });
});

// downloadFile() is a thin browser-only side effect (Blob + anchor click) with no
// branching logic; the vitest environment here is "node" (no DOM), matching this
// project's convention of unit-testing pure logic and leaving DOM I/O untested.
