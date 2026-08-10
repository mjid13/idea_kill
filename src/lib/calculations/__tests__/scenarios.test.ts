import { describe, expect, it } from "vitest";
import { generateScenarios } from "../scenarios";
import { calculateMetrics } from "../metrics";
import { exampleProject } from "@/lib/example";

describe("generateScenarios", () => {
  it("produces conservative, base, and optimistic scenarios", () => {
    const metrics = calculateMetrics(exampleProject);
    const result = generateScenarios(exampleProject, metrics);
    expect(Object.keys(result.scenarios).sort()).toEqual(["base", "conservative", "optimistic"]);
  });

  it("optimistic scenario ends with more customers than conservative", () => {
    const metrics = calculateMetrics(exampleProject);
    const result = generateScenarios(exampleProject, metrics);
    expect(result.scenarios.optimistic.customers).toBeGreaterThan(result.scenarios.conservative.customers);
  });

  it("every scenario forecast is free of NaN/Infinity", () => {
    const metrics = calculateMetrics(exampleProject);
    const result = generateScenarios(exampleProject, metrics);
    for (const forecast of Object.values(result.forecasts)) {
      for (const month of forecast) {
        for (const v of Object.values(month)) {
          expect(Number.isFinite(v)).toBe(true);
        }
      }
    }
  });
});
