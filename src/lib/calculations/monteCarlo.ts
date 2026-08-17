import type { Assumption, AssumptionRange, Project } from "@/types";
import { hasRange } from "@/types";
import { calculateMetrics } from "./metrics";
import { forecastProject } from "./projectForecast";
import { findBreakEvenMonth } from "./forecast";
import { calculateScoreBreakdown } from "@/lib/scoring";

/**
 * Monte Carlo simulation over ranged assumptions.
 *
 * A single-number assumption ("CAC = 4,000") claims a precision nobody has.
 * When an assumption instead carries a low/high range, this engine samples it
 * thousands of times, re-runs the full metrics + forecast + scoring pipeline on
 * each draw, and reports the outcome as a distribution: "72% chance of reaching
 * break-even before cash runs out" rather than one confident-looking forecast.
 */

const DEFAULT_ITERATIONS = 1000;
const FORECAST_MONTHS = 24;

// ---------------------------------------------------------------------------
// Random number generation
// ---------------------------------------------------------------------------

/** mulberry32 — small, fast, seedable PRNG. Seeded so a project simulates identically on every render. */
function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Inverse-CDF sample from a triangular distribution over [low, high] peaking at
 * `likely`. Triangular is the standard three-point-estimate distribution: it is
 * exact (no rejection sampling), monotonic in `u`, and needs nothing beyond the
 * three numbers the user already gave us.
 */
export function sampleTriangular(low: number, likely: number, high: number, u: number): number {
  if (!(high > low)) return likely;
  const mode = Math.min(high, Math.max(low, likely));
  const width = high - low;
  const modeFraction = (mode - low) / width;

  if (u <= modeFraction) return low + Math.sqrt(u * width * (mode - low));
  return high - Math.sqrt((1 - u) * width * (high - mode));
}

// ---------------------------------------------------------------------------
// Locating ranged assumptions inside a project
// ---------------------------------------------------------------------------

export interface RangedField {
  /** Dot/bracket path of the assumption, e.g. `acquisition.monthlyMarketingSpend`. */
  path: string;
  low: number;
  likely: number;
  high: number;
}

interface RangedFieldInternal extends RangedField {
  keys: Array<string | number>;
  assumption: Assumption<number> & { range: AssumptionRange };
}

function isAssumptionLike(v: unknown): v is Assumption<number> {
  if (typeof v !== "object" || v === null) return false;
  const candidate = v as Record<string, unknown>;
  return typeof candidate.value === "number" && typeof candidate.quality === "string";
}

function formatPath(keys: Array<string | number>): string {
  return keys.reduce<string>((acc, key) => (typeof key === "number" ? `${acc}[${key}]` : acc ? `${acc}.${key}` : String(key)), "");
}

function walk(node: unknown, keys: Array<string | number>, out: RangedFieldInternal[]): void {
  if (typeof node !== "object" || node === null) return;

  if (isAssumptionLike(node)) {
    if (hasRange(node)) {
      out.push({
        path: formatPath(keys),
        keys,
        low: node.range.low,
        likely: Math.min(node.range.high, Math.max(node.range.low, node.value)),
        high: node.range.high,
        assumption: node,
      });
    }
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((child, index) => walk(child, [...keys, index], out));
    return;
  }

  Object.entries(node as Record<string, unknown>).forEach(([key, child]) => walk(child, [...keys, key], out));
}

/** Every assumption in the project that carries a usable low/high range. */
export function collectRangedFields(project: Project): RangedField[] {
  const out: RangedFieldInternal[] = [];
  walk(project, [], out);
  return out.map(({ path, low, likely, high }) => ({ path, low, likely, high }));
}

function collectInternal(project: Project): RangedFieldInternal[] {
  const out: RangedFieldInternal[] = [];
  walk(project, [], out);
  return out;
}

/**
 * Returns a copy of `project` with each ranged assumption's value replaced by
 * its sampled draw. Only the nodes along the paths being changed are cloned, so
 * a thousand iterations don't deep-clone the whole document a thousand times.
 */
function withSamples(project: Project, fields: RangedFieldInternal[], samples: number[]): Project {
  const draft: Record<string, unknown> = { ...(project as unknown as Record<string, unknown>) };
  const cloned = new Map<string, Record<string, unknown>>();

  fields.forEach((field, i) => {
    let node = draft;
    for (let k = 0; k < field.keys.length - 1; k++) {
      const key = field.keys[k];
      const prefix = field.keys.slice(0, k + 1).join(".");
      let child = cloned.get(prefix);
      if (!child) {
        const current = node[key as string];
        child = (Array.isArray(current) ? [...current] : { ...(current as Record<string, unknown>) }) as Record<string, unknown>;
        cloned.set(prefix, child);
        node[key as string] = child;
      }
      node = child;
    }
    const leaf = field.keys[field.keys.length - 1] as string;
    node[leaf] = { ...field.assumption, value: samples[i] };
  });

  return draft as unknown as Project;
}

// ---------------------------------------------------------------------------
// Distributions
// ---------------------------------------------------------------------------

export interface MonteCarloDistribution {
  p10: number;
  p50: number;
  p90: number;
  mean: number;
  min: number;
  max: number;
}

/** Linear-interpolated percentile over an already-sorted ascending array. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const rank = (sorted.length - 1) * Math.min(1, Math.max(0, p));
  const lowIndex = Math.floor(rank);
  const highIndex = Math.ceil(rank);
  if (lowIndex === highIndex) return sorted[lowIndex];
  return sorted[lowIndex] + (sorted[highIndex] - sorted[lowIndex]) * (rank - lowIndex);
}

function describe(values: number[]): MonteCarloDistribution {
  if (values.length === 0) return { p10: 0, p50: 0, p90: 0, mean: 0, min: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    p10: percentile(sorted, 0.1),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    mean: sum / sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

export interface MonteCarloOptions {
  iterations?: number;
  months?: number;
  /** Overrides the project-id-derived seed. Same seed + same inputs = same result. */
  seed?: number;
}

/** Outcome bundle for one of the three headline cases (marginal percentiles, not one single run). */
export interface MonteCarloScenario {
  revenue: number;
  mrr: number;
  customers: number;
  netCashFlow: number;
  score: number;
  /** Months until break-even, or null if that percentile of runs never breaks even in the horizon. */
  breakEvenMonth: number | null;
  /** Months until cash goes negative, or null if that percentile never runs out. */
  runwayMonths: number | null;
}

export interface MonteCarloResult {
  iterations: number;
  months: number;
  /** Assumptions that carried a range and were therefore sampled. */
  rangedFields: RangedField[];
  /** % of runs that reach break-even before cash goes negative — the headline number. */
  probBreakEvenBeforeCashOut: number;
  /** % of runs that reach break-even at all inside the horizon. */
  probBreakEven: number;
  /** % of runs where cash goes negative at some point inside the horizon. */
  probCashOut: number;
  breakEvenMonth: MonteCarloDistribution | null;
  runwayMonths: MonteCarloDistribution | null;
  revenue: MonteCarloDistribution;
  mrr: MonteCarloDistribution;
  customers: MonteCarloDistribution;
  netCashFlow: MonteCarloDistribution;
  score: MonteCarloDistribution;
  /** Bear / base / bull read off the P10 / P50 / P90 of the simulated outcomes. */
  scenarios: { bear: MonteCarloScenario; base: MonteCarloScenario; bull: MonteCarloScenario };
  /** Break-even month counts, one bucket per month, plus a trailing never-reached bucket. */
  breakEvenHistogram: Array<{ month: number | null; count: number }>;
}

/**
 * Runs the simulation. Returns null when no assumption carries a range — there
 * is nothing to sample, and a "distribution" of identical runs would be a lie.
 */
export function runMonteCarlo(project: Project, options: MonteCarloOptions = {}): MonteCarloResult | null {
  const fields = collectInternal(project);
  if (fields.length === 0) return null;

  const iterations = Math.max(1, Math.round(options.iterations ?? DEFAULT_ITERATIONS));
  const months = Math.max(1, Math.round(options.months ?? FORECAST_MONTHS));
  const rng = createRng(options.seed ?? hashSeed(project.id ?? project.basicInfo.name ?? "ideaup"));

  const revenue: number[] = [];
  const mrr: number[] = [];
  const customers: number[] = [];
  const netCashFlow: number[] = [];
  const score: number[] = [];
  const breakEvenMonths: number[] = [];
  const runwayMonths: number[] = [];
  const breakEvenCounts = new Map<number, number>();

  let breakEvenBeforeCashOut = 0;
  let cashOutRuns = 0;
  const samples = new Array<number>(fields.length);

  for (let i = 0; i < iterations; i++) {
    for (let f = 0; f < fields.length; f++) {
      samples[f] = sampleTriangular(fields[f].low, fields[f].likely, fields[f].high, rng());
    }

    const sampled = withSamples(project, fields, samples);
    const metrics = calculateMetrics(sampled);
    const forecast = forecastProject(sampled, metrics, months);
    const last = forecast[forecast.length - 1];

    const breakEven = findBreakEvenMonth(forecast);
    const cashOut = forecast.find((m) => m.cashBalance < 0)?.month ?? null;

    revenue.push(last.revenue);
    mrr.push(last.mrr);
    customers.push(last.endingCustomers);
    netCashFlow.push(last.netCashFlow);
    score.push(calculateScoreBreakdown(sampled, metrics).overall);

    if (breakEven !== null) breakEvenMonths.push(breakEven);
    breakEvenCounts.set(breakEven ?? -1, (breakEvenCounts.get(breakEven ?? -1) ?? 0) + 1);

    if (cashOut !== null) {
      cashOutRuns++;
      runwayMonths.push(cashOut);
    }
    // Surviving means either the business never burns through its cash, or it
    // turns cash-flow positive no later than the month it would have run dry.
    if (breakEven !== null && (cashOut === null || breakEven <= cashOut)) breakEvenBeforeCashOut++;
  }

  const asPct = (count: number) => (count / iterations) * 100;

  const breakEvenDist = breakEvenMonths.length > 0 ? describe(breakEvenMonths) : null;
  const runwayDist = runwayMonths.length > 0 ? describe(runwayMonths) : null;
  const revenueDist = describe(revenue);
  const mrrDist = describe(mrr);
  const customersDist = describe(customers);
  const netCashFlowDist = describe(netCashFlow);
  const scoreDist = describe(score);

  // Later break-even and shorter runway are the bad end, so those two flip
  // relative to the revenue-style metrics when assembling bear/bull.
  const round = (n: number) => Math.round(n * 10) / 10;
  const scenarios = {
    bear: {
      revenue: revenueDist.p10,
      mrr: mrrDist.p10,
      customers: customersDist.p10,
      netCashFlow: netCashFlowDist.p10,
      score: scoreDist.p10,
      breakEvenMonth: breakEvenDist ? round(breakEvenDist.p90) : null,
      runwayMonths: runwayDist ? round(runwayDist.p10) : null,
    },
    base: {
      revenue: revenueDist.p50,
      mrr: mrrDist.p50,
      customers: customersDist.p50,
      netCashFlow: netCashFlowDist.p50,
      score: scoreDist.p50,
      breakEvenMonth: breakEvenDist ? round(breakEvenDist.p50) : null,
      runwayMonths: runwayDist ? round(runwayDist.p50) : null,
    },
    bull: {
      revenue: revenueDist.p90,
      mrr: mrrDist.p90,
      customers: customersDist.p90,
      netCashFlow: netCashFlowDist.p90,
      score: scoreDist.p90,
      breakEvenMonth: breakEvenDist ? round(breakEvenDist.p10) : null,
      runwayMonths: runwayDist ? round(runwayDist.p90) : null,
    },
  };

  const breakEvenHistogram: Array<{ month: number | null; count: number }> = [];
  for (let m = 1; m <= months; m++) {
    const count = breakEvenCounts.get(m) ?? 0;
    if (count > 0) breakEvenHistogram.push({ month: m, count });
  }
  const neverCount = breakEvenCounts.get(-1) ?? 0;
  if (neverCount > 0) breakEvenHistogram.push({ month: null, count: neverCount });

  return {
    iterations,
    months,
    rangedFields: fields.map(({ path, low, likely, high }) => ({ path, low, likely, high })),
    probBreakEvenBeforeCashOut: asPct(breakEvenBeforeCashOut),
    probBreakEven: asPct(breakEvenMonths.length),
    probCashOut: asPct(cashOutRuns),
    breakEvenMonth: breakEvenDist,
    runwayMonths: runwayDist,
    revenue: revenueDist,
    mrr: mrrDist,
    customers: customersDist,
    netCashFlow: netCashFlowDist,
    score: scoreDist,
    scenarios,
    breakEvenHistogram,
  };
}
