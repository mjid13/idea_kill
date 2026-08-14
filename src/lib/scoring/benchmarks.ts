import type { BusinessModel } from "@/types";
import type { ScoreAnchor } from "./interpolate";

/**
 * Business-model-specific benchmark curves. Each curve is a set of (metric
 * value -> score) anchor points fed to `interpolateScore`. SaaS benchmarks
 * are not reused blindly for marketplaces/e-commerce/service businesses —
 * every model gets its own tuned set of anchors (spec section 17).
 *
 * These anchors are directional, internally-consistent heuristics informed by
 * commonly-cited startup-finance rules of thumb (see the "Basis" comment above
 * each curve below) — they are not fitted to an external calibration dataset.
 * Treat scores as "how healthy does this look relative to typical ranges for
 * this business model," not as a precise percentile against real company data.
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
  /** Annualized Net Revenue Retention %, higher is better (100% = no net loss from existing customers). */
  netRevenueRetentionPct: ScoreAnchor[];
  /** Human-readable "typical" gross margin range shown as a hint during data entry. */
  typicalGrossMarginPct: string;
  /** Human-readable "typical" monthly churn range shown as a hint during data entry. */
  typicalMonthlyChurnPct: string;
}

const SAAS_LIKE: BusinessModelBenchmarks = {
  // Basis: SaaS gross margin is dominated by hosting/support cost, not COGS — 70-85%
  // is the commonly-cited healthy band, sub-40% suggests a cost structure closer to a
  // services business than software.
  grossMarginPct: [
    [0, 10],
    [40, 35],
    [60, 55],
    [70, 72],
    [85, 92],
    [100, 100],
  ],
  // Basis: 3x LTV:CAC is the widely-cited minimum viable ratio; 5x+ is regarded as
  // strong. Not scored higher indefinitely beyond ~8x since very high ratios can also
  // signal under-investment in growth rather than superior economics.
  ltvToCac: [
    [0, 0],
    [1, 20],
    [2, 45],
    [3, 68],
    [5, 90],
    [8, 100],
  ],
  // Basis: sub-12-month CAC payback is considered healthy for SaaS; 18-24 months is
  // workable with strong retention, beyond ~36 months capital efficiency is weak.
  cacPaybackMonths: [
    [0, 100],
    [6, 90],
    [12, 68],
    [18, 48],
    [24, 30],
    [36, 10],
    [48, 0],
  ],
  // Basis: sub-1%/mo (annualized ~12%) is best-in-class for SaaS; 3-5%/mo is a common
  // "needs attention" band; double-digit monthly churn signals a leaky bucket.
  monthlyChurnPct: [
    [0, 100],
    [1, 92],
    [3, 75],
    [5, 55],
    [8, 30],
    [15, 10],
    [25, 0],
  ],
  // Basis: 100%+ NRR is the widely-cited bar for healthy SaaS (expansion offsets churn);
  // 110-120%+ is considered best-in-class.
  netRevenueRetentionPct: [
    [70, 10],
    [85, 35],
    [100, 65],
    [110, 85],
    [120, 95],
    [140, 100],
  ],
  typicalGrossMarginPct: "70-85%",
  typicalMonthlyChurnPct: "3-7%",
};

const MARKETPLACE: BusinessModelBenchmarks = {
  // Basis: marketplace margin is take-rate driven, not COGS driven — 15-35% take rate
  // is a common healthy band, well below SaaS-style margins.
  grossMarginPct: [
    [0, 15],
    [15, 35],
    [25, 55],
    [35, 72],
    [50, 90],
    [70, 100],
  ],
  // Basis: same 3x-minimum / 5x-strong heuristic as SaaS, slightly more lenient at the
  // low end since two-sided acquisition costs are typically higher.
  ltvToCac: [
    [0, 0],
    [1, 22],
    [2, 48],
    [3, 70],
    [5, 90],
    [8, 100],
  ],
  // Basis: marketplaces typically recoup CAC faster than SaaS per-transaction, so the
  // healthy band is tighter (3-12 months) than SaaS's 6-18 months.
  cacPaybackMonths: [
    [0, 100],
    [3, 90],
    [6, 70],
    [12, 45],
    [18, 22],
    [24, 0],
  ],
  // Basis: marketplace "churn" (repeat transaction lapse) tolerates a higher rate than
  // SaaS before it's alarming, since one-off/occasional-use marketplaces are common.
  monthlyChurnPct: [
    [0, 100],
    [3, 90],
    [6, 75],
    [10, 55],
    [18, 25],
    [30, 0],
  ],
  // Basis: marketplace revenue retention is repeat-transaction driven rather than
  // subscription-expansion driven, so the healthy band sits lower than SaaS.
  netRevenueRetentionPct: [
    [50, 15],
    [70, 40],
    [85, 65],
    [100, 85],
    [115, 95],
    [130, 100],
  ],
  typicalGrossMarginPct: "15-35%",
  typicalMonthlyChurnPct: "6-10%",
};

const ECOMMERCE: BusinessModelBenchmarks = {
  // Basis: physical-goods COGS keeps margin lower than software; 35-65% is a typical
  // healthy range depending on category and fulfillment model.
  grossMarginPct: [
    [0, 10],
    [10, 30],
    [20, 50],
    [35, 70],
    [50, 90],
    [65, 100],
  ],
  // Basis: e-commerce LTV is repeat-purchase driven and typically thinner than SaaS
  // LTV, so the curve reaches "strong" at a lower ratio (4-6x vs 5-8x for SaaS).
  ltvToCac: [
    [0, 0],
    [1, 25],
    [1.5, 45],
    [2.5, 68],
    [4, 88],
    [6, 100],
  ],
  // Basis: e-commerce needs to recoup CAC fast (often within one purchase cycle) —
  // healthy band is 1-6 months, much tighter than subscription businesses.
  cacPaybackMonths: [
    [0, 100],
    [1, 90],
    [3, 70],
    [6, 45],
    [9, 20],
    [12, 0],
  ],
  // Basis: "churn" here means lapsed repeat-purchase rate — tolerable up to ~10-20%/mo
  // given many e-commerce customers are naturally infrequent/occasional buyers.
  monthlyChurnPct: [
    [0, 100],
    [5, 85],
    [10, 65],
    [20, 40],
    [35, 15],
    [50, 0],
  ],
  // Basis: e-commerce retention is repeat-purchase driven and typically the thinnest
  // of the recurring-ish models — healthy band starts lower than marketplace/SaaS.
  netRevenueRetentionPct: [
    [40, 15],
    [60, 40],
    [80, 65],
    [95, 85],
    [110, 95],
    [125, 100],
  ],
  typicalGrossMarginPct: "35-65%",
  typicalMonthlyChurnPct: "10-20%",
};

const SERVICE: BusinessModelBenchmarks = {
  // Basis: services carry labor cost as COGS; 50-80% margin is a common healthy band
  // for consulting/agency-style businesses, lower than pure software.
  grossMarginPct: [
    [0, 15],
    [20, 35],
    [35, 55],
    [50, 75],
    [65, 92],
    [80, 100],
  ],
  // Basis: same 3x/5x SaaS-style heuristic, since retainer-style service relationships
  // behave similarly to subscriptions once won.
  ltvToCac: [
    [0, 0],
    [1, 25],
    [2, 50],
    [3, 70],
    [5, 90],
    [8, 100],
  ],
  // Basis: services typically win business (and recoup CAC) faster than SaaS given
  // shorter, relationship-driven sales cycles — 3-12 months is a common healthy band.
  cacPaybackMonths: [
    [0, 100],
    [3, 88],
    [6, 68],
    [12, 45],
    [18, 20],
    [24, 0],
  ],
  // Basis: retainer/engagement churn in the 2-10%/mo range is typical; higher signals
  // client relationships aren't sticky.
  monthlyChurnPct: [
    [0, 100],
    [2, 90],
    [5, 72],
    [10, 48],
    [18, 20],
    [30, 0],
  ],
  // Basis: retainer-style service relationships behave similarly to subscriptions
  // once won, so the curve is close to SaaS with a slightly more lenient floor.
  netRevenueRetentionPct: [
    [70, 15],
    [85, 40],
    [100, 68],
    [110, 88],
    [125, 97],
    [140, 100],
  ],
  typicalGrossMarginPct: "50-80%",
  typicalMonthlyChurnPct: "2-8%",
};

const ONE_TIME: BusinessModelBenchmarks = {
  // Basis: one-time-purchase margin expectations sit between e-commerce and service,
  // depending on whether the product is physical or digital.
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
  // Basis: without recurring revenue, LTV is really "repeat-purchase value" — the
  // curve is deliberately more lenient (reaches "strong" around 2.5-4x) than
  // subscription businesses.
  ltvToCac: [
    [0, 0],
    [0.5, 25],
    [1, 50],
    [1.5, 70],
    [2.5, 90],
    [4, 100],
  ],
  // Basis: a single-transaction business needs to recoup CAC within the first sale or
  // two — healthy band is under 6 months.
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
  // NRR is not a native concept for one-time purchases; curve kept flat/neutral
  // (the retention step is hidden entirely for this business model anyway).
  netRevenueRetentionPct: [
    [0, 80],
    [200, 80],
  ],
  typicalGrossMarginPct: "45-75%",
  typicalMonthlyChurnPct: "Not applicable — one-time purchase",
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
