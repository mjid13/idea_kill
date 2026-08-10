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
// Aggregate project record
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  createdAt: string;
  updatedAt: string;
  basicInfo: BasicInfo;
  market: MarketAssumptions;
  pricing: PricingAssumptions;
  acquisition: AcquisitionAssumptions;
  retention: RetentionAssumptions;
  unitEconomics: UnitEconomicsAssumptions;
  costs: CostAssumptions;
  funding: FundingAssumptions;
  validation: ValidationAssessment;
  team: TeamAssessment;
  risk: RiskAssessment;
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
  cac: number;
  leadToCustomerConversionPct: number | null;
}

export interface RetentionMetrics {
  monthlyChurnPct: number;
  customerLifetimeMonths: number | null;
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

export interface CalculatedMetrics {
  market: MarketMetrics;
  revenue: RevenueMetrics;
  acquisition: AcquisitionMetrics;
  retention: RetentionMetrics;
  unitEconomics: UnitEconomicsMetrics;
  operating: OperatingMetrics;
  funding: FundingMetrics;
  breakEven: BreakEvenMetrics;
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
  message: string;
  detail?: string;
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

export interface DecisionSummary {
  verdict: DecisionVerdict;
  title: string;
  description: string;
  reasons: string[];
}
