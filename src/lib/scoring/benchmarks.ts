import type { BusinessModel } from "@/types";
import type { ScoreAnchor } from "./interpolate";

/**
 * Business-model-specific benchmark curves. Each curve is a set of (metric
 * value -> score) anchor points fed to `interpolateScore`. SaaS benchmarks
 * are not reused blindly for marketplaces/e-commerce/service businesses —
 * every model gets its own tuned set of anchors (spec section 17).
 */
export interface BusinessModelBenchmarks {
  /** Gross margin %, higher is better. */
  grossMarginPct: ScoreAnchor[];
  /** LTV:CAC ratio, higher is better (caps out — spec notes >5x may mean under-investment, not scored higher forever). */
  ltvToCac: ScoreAnchor[];
  /** CAC payback period in months, lower is better. */
  cacPaybackMonths: ScoreAnchor[];
  /** Monthly churn %, lower is better. */
  monthlyChurnPct: ScoreAnchor[];
}

const SAAS_LIKE: BusinessModelBenchmarks = {
  grossMarginPct: [
    [0, 10],
    [40, 35],
    [60, 55],
    [70, 72],
    [85, 92],
    [100, 100],
  ],
  ltvToCac: [
    [0, 0],
    [1, 20],
    [2, 45],
    [3, 68],
    [5, 90],
    [8, 100],
  ],
  cacPaybackMonths: [
    [0, 100],
    [6, 90],
    [12, 68],
    [18, 48],
    [24, 30],
    [36, 10],
    [48, 0],
  ],
  monthlyChurnPct: [
    [0, 100],
    [1, 92],
    [3, 75],
    [5, 55],
    [8, 30],
    [15, 10],
    [25, 0],
  ],
};

const MARKETPLACE: BusinessModelBenchmarks = {
  grossMarginPct: [
    [0, 15],
    [15, 35],
    [25, 55],
    [35, 72],
    [50, 90],
    [70, 100],
  ],
  ltvToCac: [
    [0, 0],
    [1, 22],
    [2, 48],
    [3, 70],
    [5, 90],
    [8, 100],
  ],
  cacPaybackMonths: [
    [0, 100],
    [3, 90],
    [6, 70],
    [12, 45],
    [18, 22],
    [24, 0],
  ],
  monthlyChurnPct: [
    [0, 100],
    [3, 90],
    [6, 75],
    [10, 55],
    [18, 25],
    [30, 0],
  ],
};

const ECOMMERCE: BusinessModelBenchmarks = {
  grossMarginPct: [
    [0, 10],
    [10, 30],
    [20, 50],
    [35, 70],
    [50, 90],
    [65, 100],
  ],
  ltvToCac: [
    [0, 0],
    [1, 25],
    [1.5, 45],
    [2.5, 68],
    [4, 88],
    [6, 100],
  ],
  cacPaybackMonths: [
    [0, 100],
    [1, 90],
    [3, 70],
    [6, 45],
    [9, 20],
    [12, 0],
  ],
  monthlyChurnPct: [
    [0, 100],
    [5, 85],
    [10, 65],
    [20, 40],
    [35, 15],
    [50, 0],
  ],
};

const SERVICE: BusinessModelBenchmarks = {
  grossMarginPct: [
    [0, 15],
    [20, 35],
    [35, 55],
    [50, 75],
    [65, 92],
    [80, 100],
  ],
  ltvToCac: [
    [0, 0],
    [1, 25],
    [2, 50],
    [3, 70],
    [5, 90],
    [8, 100],
  ],
  cacPaybackMonths: [
    [0, 100],
    [3, 88],
    [6, 68],
    [12, 45],
    [18, 20],
    [24, 0],
  ],
  monthlyChurnPct: [
    [0, 100],
    [2, 90],
    [5, 72],
    [10, 48],
    [18, 20],
    [30, 0],
  ],
};

const ONE_TIME: BusinessModelBenchmarks = {
  grossMarginPct: [
    [0, 10],
    [15, 30],
    [30, 55],
    [45, 75],
    [60, 92],
    [75, 100],
  ],
  // LTV is less meaningful for one-time purchases; keep a lenient curve
  // centered on repeat-purchase-driven ratios.
  ltvToCac: [
    [0, 0],
    [0.5, 25],
    [1, 50],
    [1.5, 70],
    [2.5, 90],
    [4, 100],
  ],
  cacPaybackMonths: [
    [0, 100],
    [1, 90],
    [2, 70],
    [3, 45],
    [6, 15],
    [9, 0],
  ],
  // Churn is not a native concept for one-time purchases; curve kept flat/neutral.
  monthlyChurnPct: [
    [0, 80],
    [100, 80],
  ],
};

const USAGE_BASED: BusinessModelBenchmarks = SAAS_LIKE;
const SUBSCRIPTION: BusinessModelBenchmarks = SAAS_LIKE;
const OTHER: BusinessModelBenchmarks = SERVICE;

export const BUSINESS_MODEL_BENCHMARKS: Record<BusinessModel, BusinessModelBenchmarks> = {
  saas: SAAS_LIKE,
  subscription: SUBSCRIPTION,
  marketplace: MARKETPLACE,
  ecommerce: ECOMMERCE,
  one_time: ONE_TIME,
  service: SERVICE,
  usage_based: USAGE_BASED,
  other: OTHER,
};

export function getBenchmarks(businessModel: BusinessModel): BusinessModelBenchmarks {
  return BUSINESS_MODEL_BENCHMARKS[businessModel] ?? OTHER;
}
