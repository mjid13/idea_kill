// Domain model types for the Product Viability Calculator.
// Kept free of any UI or persistence concerns so they can be reused by the
// calculation engine, scoring engine, insight engine, and presentation layer.

export type Currency = "OMR" | "USD" | "SAR" | "AED" | "EUR" | "GBP";

export type BusinessModel =
  | "saas"
  | "subscription"
  | "marketplace"
  | "ecommerce"
  | "one_time"
  | "service"
  | "usage_based"
  | "other";

export type BillingPeriod = "monthly" | "annual" | "one_time" | "usage_based";

/** Marks whether an input represents a real, estimated, or missing value. */
export type DataQuality = "known" | "estimated" | "unknown";

/** A single numeric input paired with metadata about how reliable it is. */
export interface Assumption<T = number> {
  value: T;
  quality: DataQuality;
}

export function known<T>(value: T): Assumption<T> {
  return { value, quality: "known" };
}

export function estimated<T>(value: T): Assumption<T> {
  return { value, quality: "estimated" };
}

export function unknownValue<T>(fallback: T): Assumption<T> {
  return { value: fallback, quality: "unknown" };
}

// ---------------------------------------------------------------------------
// Basic information
// ---------------------------------------------------------------------------

export interface BasicInfo {
  name: string;
  description: string;
  businessModel: BusinessModel;
  currency: Currency;
}

// ---------------------------------------------------------------------------
// Step 1 - Market
// ---------------------------------------------------------------------------

export interface MarketAssumptions {
  /** Total number of potential customers in the wider market. */
  totalPotentialCustomers: Assumption<number>;
  /** Average annual spend per customer in the target category. */
  averageAnnualCustomerSpend: Assumption<number>;
  /** Percentage (0-100) of the total market that is realistically addressable. */
  addressableMarketPct: Assumption<number>;
  /** Percentage (0-100) of the addressable market realistically obtainable. */
  obtainableMarketPct: Assumption<number>;
  /** Optional direct overrides, used instead of the derived calculation when provided. */
  tamOverride?: number;
  samOverride?: number;
  somOverride?: number;
  /** Customers targeted within the planning horizon, used for penetration. */
  targetCustomers: Assumption<number>;
}

// ---------------------------------------------------------------------------
// Step 2 - Pricing & customers
// ---------------------------------------------------------------------------

export interface PricingAssumptions {
  productPrice: Assumption<number>;
  billingPeriod: BillingPeriod;
  currentCustomers: Assumption<number>;
  expectedCustomers12mo: Assumption<number>;
  expectedMonthlyCustomerGrowthPct: Assumption<number>;
  freeToPaidConversionPct?: Assumption<number>;
  /** Estimated % of monthly revenue coming from your largest few customers. */
  topCustomersRevenueSharePct?: Assumption<number>;
}

// ---------------------------------------------------------------------------
// Step 2b - Marketplace GMV & take rate (only applicable to businessModel "marketplace")
// ---------------------------------------------------------------------------

export interface MarketplaceAssumptions {
  averageOrderValue: Assumption<number>;
  takeRatePct: Assumption<number>;
  transactionsPerCustomerPerMonth: Assumption<number>;
}

// ---------------------------------------------------------------------------
// Step 3 - Customer acquisition
// ---------------------------------------------------------------------------

export interface AcquisitionAssumptions {
  monthlyMarketingSpend: Assumption<number>;
  monthlySalesSpend: Assumption<number>;
  newCustomersAcquiredMonthly: Assumption<number>;
  monthlyLeads?: Assumption<number>;
  leadToCustomerConversionPct?: Assumption<number>;
}

// ---------------------------------------------------------------------------
// Step 4 - Retention
// ---------------------------------------------------------------------------

export interface RetentionAssumptions {
  monthlyChurnPct: Assumption<number>;
  annualChurnPct?: Assumption<number>;
  averageCustomerLifetimeMonths?: Assumption<number>;
  /** Revenue expansion (upsell/cross-sell) as a % of MRR added each month, from existing customers. */
  monthlyExpansionRevenuePct?: Assumption<number>;
  /** Revenue contraction (downgrades) as a % of MRR lost each month, from existing customers. */
  monthlyContractionRevenuePct?: Assumption<number>;
}

// ---------------------------------------------------------------------------
// Step 5 - Unit economics
// ---------------------------------------------------------------------------

export interface UnitEconomicsAssumptions {
  revenuePerCustomer: Assumption<number>;
  directCostPerCustomer: Assumption<number>;
  paymentProcessingPct: Assumption<number>;
  infrastructureCostPerCustomer: Assumption<number>;
  supportCostPerCustomer: Assumption<number>;
  otherVariableCostPerCustomer: Assumption<number>;
}

// ---------------------------------------------------------------------------
// Step 6 - Operating expenses
// ---------------------------------------------------------------------------

export interface CostAssumptions {
  founderSalaries: Assumption<number>;
  employeeSalaries: Assumption<number>;
  contractorExpenses: Assumption<number>;
  officeExpenses: Assumption<number>;
  infrastructure: Assumption<number>;
  softwareSubscriptions: Assumption<number>;
  marketing: Assumption<number>;
  sales: Assumption<number>;
  legalAccounting: Assumption<number>;
  otherMonthlyExpenses: Assumption<number>;
}

// ---------------------------------------------------------------------------
// Step 7 - Funding & runway
// ---------------------------------------------------------------------------

export interface FundingAssumptions {
  availableCash: Assumption<number>;
  initialInvestment: Assumption<number>;
  otherMonthlyIncome: Assumption<number>;
  /**
   * Pre-money valuation for the round represented by `initialInvestment`. Distinct from
   * the pitch deck's narrative-only `PitchRoundDetails.valuation` (never affects
   * calculations) — this field drives real dilution math.
   */
  preMoneyValuation?: Assumption<number>;
}

// ---------------------------------------------------------------------------
// Step 8 - Validation assessment (1-5 ratings)
// ---------------------------------------------------------------------------

export interface ValidationAssessment {
  problemPain: number;
  problemFrequency: number;
  problemAlreadySpendingMoney: number;
  customersInterviewed: number;
  hasUsers: number;
  hasPayingCustomers: number;
  hasSignedLois: number;
  customersRequestedSolution: number;
  technicallyFeasible: number;
  mvpDifficulty: number;
  productDifferentiation: number;
  knowsHowToReachCustomers: number;
  hasAudience: number;
  hasPartnerships: number;
  hasUnfairDistributionAdvantage: number;
  competitionIntensity: number;
  differentiationStrength: number;
  switchingEase: number;
}

// ---------------------------------------------------------------------------
// Step 9 - Team assessment (1-5 ratings)
// ---------------------------------------------------------------------------

export interface TeamAssessment {
  domainExpertise: number;
  technicalAbility: number;
  salesCapability: number;
  marketingCapability: number;
  founderCommitment: number;
  industryRelationships: number;
  accessToCapital: number;
}

// ---------------------------------------------------------------------------
// Step 10 - Risk assessment (1-5 ratings, high = risky)
// ---------------------------------------------------------------------------

export interface RiskAssessment {
  technicalRisk: number;
  marketRisk: number;
  regulatoryRisk: number;
  competitiveRisk: number;
  financialRisk: number;
  dependencyRisk: number;
}

// ---------------------------------------------------------------------------
// Step 11 - Pitch narrative (optional, investor-deck content only — not
// used by any calculation or score, so absence never affects viability).
// ---------------------------------------------------------------------------

export interface TractionDataPoint {
  id: string;
  /** e.g. "Jan 2026" or "Month 3" — free-form, whatever the user tracks by. */
  label: string;
  customers?: number;
  mrr?: number;
}

export interface PitchTeamMember {
  id: string;
  name: string;
  role: string;
  bio?: string;
}

export interface PitchCompetitor {
  id: string;
  name: string;
  /** Your differentiation against this specific competitor. */
  edge: string;
}

export type FundingRoundType = "pre_seed" | "seed" | "series_a" | "series_b_plus" | "bridge";

export interface PitchRoundDetails {
  roundType?: FundingRoundType;
  valuation?: number;
  previousInvestors?: string;
}

export interface PitchAssumptions {
  problemStatement?: string;
  competitiveLandscape?: string;
  traction?: string;
  teamBios?: string;
  vision?: string;
  fundingAsk?: Assumption<number>;
  useOfFunds?: string;
  /**
   * Deck-only structured extras. These are never part of the main wizard —
   * they're entered from within the Pitch Deck view itself (see
   * /project/[id]/pitch-deck/edit), since they only matter to someone who
   * actually wants to generate a deck.
   */
  tractionHistory?: TractionDataPoint[];
  teamMembers?: PitchTeamMember[];
  competitors?: PitchCompetitor[];
  round?: PitchRoundDetails;
}

// ---------------------------------------------------------------------------
// Aggregate project record
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  /** Version of the persisted raw project document. */
  schemaVersion: number;
  /** Optimistic-concurrency revision assigned by the repository. */
  revision: number;
  createdAt: string;
  updatedAt: string;
  basicInfo: BasicInfo;
  market: MarketAssumptions;
  pricing: PricingAssumptions;
  /** Optional — only populated/shown when basicInfo.businessModel is "marketplace". */
  marketplace?: MarketplaceAssumptions;
  acquisition: AcquisitionAssumptions;
  retention: RetentionAssumptions;
  unitEconomics: UnitEconomicsAssumptions;
  costs: CostAssumptions;
  funding: FundingAssumptions;
  validation: ValidationAssessment;
  team: TeamAssessment;
  risk: RiskAssessment;
  /** Optional — absent on projects created before this step existed. */
  pitch?: PitchAssumptions;
}

// ---------------------------------------------------------------------------
// Calculated outputs
// ---------------------------------------------------------------------------

export interface MarketMetrics {
  tam: number;
  sam: number;
  som: number;
  requiredMarketPenetrationPct: number;
}

export interface RevenueMetrics {
  monthlyArpu: number;
  mrr: number;
  arr: number;
  monthlyRevenue: number;
  annualRevenue: number;
}

export interface AcquisitionMetrics {
  /** null when spend was entered but zero customers were acquired — CAC is unknown, not $0. */
  cac: number | null;
  leadToCustomerConversionPct: number | null;
}

export interface RetentionMetrics {
  monthlyChurnPct: number;
  customerLifetimeMonths: number | null;
  /** Annualized Net Revenue Retention — point-in-time, from monthly churn/expansion/contraction. */
  netRevenueRetentionPct: number;
}

export interface UnitEconomicsMetrics {
  variableCostPerCustomer: number;
  grossProfitPerCustomer: number;
  grossMarginPct: number;
  ltv: number;
  ltvToCacRatio: number | null;
  cacPaybackMonths: number | null;
}

export interface OperatingMetrics {
  monthlyOperatingCost: number;
  monthlyBurn: number;
  isCashFlowPositive: boolean;
}

export interface FundingMetrics {
  runwayMonths: number | null;
  isProfitable: boolean;
}

export interface BreakEvenMetrics {
  contributionMarginPerCustomer: number;
  breakEvenCustomers: number | null;
  breakEvenRevenue: number | null;
  remainingCustomersToBreakEven: number | null;
}

export type ConcentrationRiskLevel = "low" | "moderate" | "high" | "severe";

export interface DilutionMetrics {
  postMoneyValuation: number | null;
  equityGivenUpPct: number | null;
  founderRemainingOwnershipPct: number | null;
}

export interface MarketplaceMetrics {
  gmv: number;
  takeRateRevenue: number;
  effectiveArpu: number;
  takeRatePct: number;
}

export interface ConcentrationMetrics {
  topCustomersRevenueSharePct: number;
  riskLevel: ConcentrationRiskLevel;
}

export interface CalculatedMetrics {
  market: MarketMetrics;
  revenue: RevenueMetrics;
  acquisition: AcquisitionMetrics;
  retention: RetentionMetrics;
  unitEconomics: UnitEconomicsMetrics;
  operating: OperatingMetrics;
  funding: FundingMetrics;
  breakEven: BreakEvenMetrics;
  dilution: DilutionMetrics;
  concentration: ConcentrationMetrics;
  /** Only populated when businessModel is "marketplace" and the marketplace slice has data. */
  marketplace: MarketplaceMetrics | null;
}

// ---------------------------------------------------------------------------
// SaaS efficiency ratios — sibling to CalculatedMetrics, not a member of it,
// since these are derived from a 12-month forecast and CalculatedMetrics must
// not depend on the forecast (the forecast itself takes CalculatedMetrics as
// an input — a dependency in the other direction would be circular).
// ---------------------------------------------------------------------------

export interface EfficiencyMetrics {
  annualGrowthPct: number | null;
  profitMarginPct: number | null;
  ruleOf40Score: number | null;
  burnMultiple: number | null;
  magicNumber: number | null;
  quickRatio: number | null;
}

// ---------------------------------------------------------------------------
// Forecasting
// ---------------------------------------------------------------------------

export interface ForecastMonth {
  month: number;
  beginningCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  endingCustomers: number;
  mrr: number;
  revenue: number;
  variableCosts: number;
  grossProfit: number;
  operatingExpenses: number;
  netCashFlow: number;
  cashBalance: number;
  /** Revenue added this month from upsell/cross-sell to existing customers (0 for non-recurring or when unset). */
  expansionRevenue: number;
  /** Revenue lost this month from downgrades among existing customers (0 for non-recurring or when unset). */
  contractionRevenue: number;
}

// ---------------------------------------------------------------------------
// Scenario analysis
// ---------------------------------------------------------------------------

export type ScenarioName = "conservative" | "base" | "optimistic";

export interface ScenarioSummary {
  name: ScenarioName;
  label: string;
  revenue: number;
  mrr: number;
  customers: number;
  profit: number;
  runwayMonths: number | null;
  breakEvenMonth: number | null;
}

export interface ScenarioResult {
  scenarios: Record<ScenarioName, ScenarioSummary>;
  forecasts: Record<ScenarioName, ForecastMonth[]>;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export type ScoreCategory =
  | "market"
  | "unitEconomics"
  | "financial"
  | "validation"
  | "execution"
  | "risk";

export interface CategoryScore {
  category: ScoreCategory;
  label: string;
  score: number; // 0-100
  weight: number; // 0-1
  factors: ScoreFactor[];
}

export interface ScoreFactor {
  label: string;
  score: number; // 0-100
  detail: string;
}

export interface ScoreBreakdown {
  overall: number; // 0-100
  categories: Record<ScoreCategory, CategoryScore>;
  confidence: number; // 0-100
  maturityStage: MaturityStage;
}

export type MaturityStageId = 0 | 1 | 2 | 3 | 4 | 5;

export interface MaturityStage {
  stage: MaturityStageId;
  label: string;
  description: string;
}

export type ViabilityClassification =
  | "High Risk"
  | "Weak"
  | "Promising"
  | "Strong"
  | "Very Strong";

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export interface Insight {
  id: string;
  /** Translation key (the English source string, used verbatim as an i18n message id). */
  message: string;
  messageParams?: Record<string, string | number>;
  /** Translation key for the secondary line, if any. */
  detail?: string;
  detailParams?: Record<string, string | number>;
}

export interface InsightReport {
  strengths: Insight[];
  warnings: Insight[];
  criticalRisks: Insight[];
  opportunities: Insight[];
  recommendedActions: Insight[];
}

export type DecisionVerdict =
  | "explore_further"
  | "validate_before_building"
  | "improve_economics"
  | "strong_candidate"
  | "high_risk";

export interface DecisionReason {
  /** Translation key (the English source string, used verbatim as an i18n message id). */
  template: string;
  params?: Record<string, string | number>;
}

export interface DecisionSummary {
  verdict: DecisionVerdict;
  title: string;
  description: string;
  reasons: DecisionReason[];
}
