import { describe, expect, it } from "vitest";
import { collectRangedFields, percentile, runMonteCarlo, sampleTriangular } from "../monteCarlo";
import { exampleProject } from "@/lib/example";
import { known, ranged, type Project } from "@/types";

/** The example project ships with ranges on two levers; these tests reuse it as-is. */
function rangedProject(): Project {
  return exampleProject;
}

/** Same project with every range stripped back to its most likely single number. */
function singleNumberProject(): Project {
  return {
    ...exampleProject,
    acquisition: {
      ...exampleProject.acquisition,
      newCustomersAcquiredMonthly: known(exampleProject.acquisition.newCustomersAcquiredMonthly.value),
    },
    retention: { ...exampleProject.retention, monthlyChurnPct: known(exampleProject.retention.monthlyChurnPct.value) },
  };
}

describe("sampleTriangular", () => {
  it("stays inside the range for any u in [0, 1]", () => {
    for (let i = 0; i <= 100; i++) {
      const sample = sampleTriangular(2500, 4000, 5000, i / 100);
      expect(sample).toBeGreaterThanOrEqual(2500);
      expect(sample).toBeLessThanOrEqual(5000);
    }
  });

  it("hits the endpoints at u = 0 and u = 1", () => {
    expect(sampleTriangular(2500, 4000, 5000, 0)).toBeCloseTo(2500);
    expect(sampleTriangular(2500, 4000, 5000, 1)).toBeCloseTo(5000);
  });

  it("is monotonic in u", () => {
    let previous = -Infinity;
    for (let i = 0; i <= 200; i++) {
      const sample = sampleTriangular(0, 30, 100, i / 200);
      expect(sample).toBeGreaterThanOrEqual(previous);
      previous = sample;
    }
  });

  it("collapses to the most likely value for a degenerate range", () => {
    expect(sampleTriangular(4000, 4000, 4000, 0.37)).toBe(4000);
  });

  it("puts the median on the mode side for a right-skewed range", () => {
    // Mode at 4000 of [2500, 5000] sits above the midpoint, so the median must too.
    expect(sampleTriangular(2500, 4000, 5000, 0.5)).toBeGreaterThan(3750);
  });
});

describe("percentile", () => {
  it("interpolates between neighbours", () => {
    expect(percentile([0, 10, 20, 30, 40], 0.5)).toBe(20);
    expect(percentile([0, 10], 0.25)).toBe(2.5);
  });

  it("handles empty and single-element inputs", () => {
    expect(percentile([], 0.5)).toBe(0);
    expect(percentile([7], 0.9)).toBe(7);
  });
});

describe("collectRangedFields", () => {
  it("finds nothing on an all-single-number project", () => {
    expect(collectRangedFields(singleNumberProject())).toEqual([]);
  });

  it("finds ranged assumptions by path, ignoring degenerate ranges", () => {
    const project = {
      ...rangedProject(),
      funding: { ...exampleProject.funding, availableCash: { value: 100, quality: "estimated" as const, range: { low: 100, high: 100 } } },
    };
    const paths = collectRangedFields(project).map((f) => f.path);
    expect(paths).toContain("acquisition.newCustomersAcquiredMonthly");
    expect(paths).toContain("retention.monthlyChurnPct");
    expect(paths).not.toContain("funding.availableCash");
  });
});

describe("runMonteCarlo", () => {
  it("returns null when no assumption carries a range", () => {
    expect(runMonteCarlo(singleNumberProject())).toBeNull();
  });

  it("is deterministic for the same project and seed", () => {
    const project = rangedProject();
    const a = runMonteCarlo(project, { iterations: 200, seed: 42 });
    const b = runMonteCarlo(project, { iterations: 200, seed: 42 });
    expect(a).toEqual(b);
  });

  it("reports probabilities as percentages within 0-100", () => {
    const result = runMonteCarlo(rangedProject(), { iterations: 300, seed: 7 })!;
    for (const p of [result.probBreakEvenBeforeCashOut, result.probBreakEven, result.probCashOut]) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
    // Breaking even before cash runs out is a subset of breaking even at all.
    expect(result.probBreakEvenBeforeCashOut).toBeLessThanOrEqual(result.probBreakEven);
  });

  it("orders bear <= base <= bull on revenue-shaped metrics", () => {
    const { scenarios } = runMonteCarlo(rangedProject(), { iterations: 400, seed: 11 })!;
    expect(scenarios.bear.revenue).toBeLessThanOrEqual(scenarios.base.revenue);
    expect(scenarios.base.revenue).toBeLessThanOrEqual(scenarios.bull.revenue);
    expect(scenarios.bear.customers).toBeLessThanOrEqual(scenarios.bull.customers);
    expect(scenarios.bear.score).toBeLessThanOrEqual(scenarios.bull.score);
  });

  it("shows a later break-even in the bear case than the bull case", () => {
    const { scenarios } = runMonteCarlo(rangedProject(), { iterations: 400, seed: 13 })!;
    if (scenarios.bear.breakEvenMonth !== null && scenarios.bull.breakEvenMonth !== null) {
      expect(scenarios.bear.breakEvenMonth).toBeGreaterThanOrEqual(scenarios.bull.breakEvenMonth);
    }
  });

  it("does not mutate the source project", () => {
    const project = rangedProject();
    const before = JSON.stringify(project);
    runMonteCarlo(project, { iterations: 100, seed: 3 });
    expect(JSON.stringify(project)).toBe(before);
  });

  it("histogram counts add up to the iteration count", () => {
    const result = runMonteCarlo(rangedProject(), { iterations: 250, seed: 5 })!;
    const total = result.breakEvenHistogram.reduce((sum, bucket) => sum + bucket.count, 0);
    expect(total).toBe(250);
  });

  it("produces finite distribution values", () => {
    const result = runMonteCarlo(rangedProject(), { iterations: 200, seed: 9 })!;
    for (const dist of [result.revenue, result.mrr, result.customers, result.netCashFlow, result.score]) {
      for (const v of Object.values(dist)) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("widens the outcome spread as the input range widens", () => {
    const base = exampleProject.acquisition.newCustomersAcquiredMonthly.value;
    const withRange = (factor: number): Project => ({
      ...exampleProject,
      acquisition: {
        ...exampleProject.acquisition,
        newCustomersAcquiredMonthly: ranged(base * (1 - factor), base, base * (1 + factor)),
      },
    });

    const narrow = runMonteCarlo(withRange(0.1), { iterations: 400, seed: 21 })!;
    const wide = runMonteCarlo(withRange(0.6), { iterations: 400, seed: 21 })!;
    expect(wide.revenue.p90 - wide.revenue.p10).toBeGreaterThan(narrow.revenue.p90 - narrow.revenue.p10);
  });
});
