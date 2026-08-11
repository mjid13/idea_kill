import { describe, expect, it } from "vitest";
import { buildExportBundle, buildExportCsv } from "../exportData";
import { calculateMetrics, generateScenarios } from "@/lib/calculations";
import { calculateScoreBreakdown } from "@/lib/scoring";
import { generateInsights } from "@/lib/insights";
import { exampleProject } from "@/lib/example";

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
    expect(lines[0]).toBe("Section,Field,Value,Data quality");
    expect(lines.length).toBeGreaterThan(50); // every input + output + score row
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
