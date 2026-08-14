import { z } from "zod";
import { pitchCompetitorSchema, pitchRoundDetailsSchema, pitchTeamMemberSchema, tractionDataPointSchema } from "./pitchDeckSchema";

const dataQualitySchema = z.enum(["known", "estimated", "unknown"]);

const assumptionSchema = z.object({
  value: z.number().finite("Must be a finite number"),
  quality: dataQualitySchema,
});

const optionalAssumptionSchema = assumptionSchema.optional();

const nonNegativeAssumption = assumptionSchema.refine((a) => a.quality === "unknown" || a.value >= 0, {
  message: "Must be zero or greater",
});

export const basicInfoSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string(),
  businessModel: z.enum(["saas", "subscription", "marketplace", "ecommerce", "one_time", "service", "usage_based", "other"]),
  currency: z.enum(["OMR", "USD", "SAR", "AED", "EUR", "GBP"]),
});

export const marketSchema = z.object({
  totalPotentialCustomers: nonNegativeAssumption,
  averageAnnualCustomerSpend: nonNegativeAssumption,
  addressableMarketPct: assumptionSchema,
  obtainableMarketPct: assumptionSchema,
  tamOverride: z.number().optional(),
  samOverride: z.number().optional(),
  somOverride: z.number().optional(),
  targetCustomers: nonNegativeAssumption,
});

export const pricingSchema = z.object({
  productPrice: nonNegativeAssumption,
  billingPeriod: z.enum(["monthly", "annual", "one_time", "usage_based"]),
  currentCustomers: nonNegativeAssumption,
  expectedCustomers12mo: nonNegativeAssumption,
  expectedMonthlyCustomerGrowthPct: assumptionSchema,
  freeToPaidConversionPct: optionalAssumptionSchema,
  topCustomersRevenueSharePct: optionalAssumptionSchema,
});

export const marketplaceSchema = z.object({
  averageOrderValue: nonNegativeAssumption,
  takeRatePct: assumptionSchema,
  transactionsPerCustomerPerMonth: nonNegativeAssumption,
});

export const acquisitionSchema = z.object({
  monthlyMarketingSpend: nonNegativeAssumption,
  monthlySalesSpend: nonNegativeAssumption,
  newCustomersAcquiredMonthly: nonNegativeAssumption,
  monthlyLeads: optionalAssumptionSchema,
  leadToCustomerConversionPct: optionalAssumptionSchema,
});

export const retentionSchema = z.object({
  monthlyChurnPct: assumptionSchema,
  annualChurnPct: optionalAssumptionSchema,
  averageCustomerLifetimeMonths: optionalAssumptionSchema,
  monthlyExpansionRevenuePct: optionalAssumptionSchema,
  monthlyContractionRevenuePct: optionalAssumptionSchema,
});

export const unitEconomicsSchema = z.object({
  revenuePerCustomer: nonNegativeAssumption,
  directCostPerCustomer: nonNegativeAssumption,
  paymentProcessingPct: assumptionSchema,
  infrastructureCostPerCustomer: nonNegativeAssumption,
  supportCostPerCustomer: nonNegativeAssumption,
  otherVariableCostPerCustomer: nonNegativeAssumption,
});

export const costsSchema = z.object({
  founderSalaries: nonNegativeAssumption,
  employeeSalaries: nonNegativeAssumption,
  contractorExpenses: nonNegativeAssumption,
  officeExpenses: nonNegativeAssumption,
  infrastructure: nonNegativeAssumption,
  softwareSubscriptions: nonNegativeAssumption,
  marketing: nonNegativeAssumption,
  sales: nonNegativeAssumption,
  legalAccounting: nonNegativeAssumption,
  otherMonthlyExpenses: nonNegativeAssumption,
});

export const fundingSchema = z.object({
  availableCash: nonNegativeAssumption,
  initialInvestment: nonNegativeAssumption,
  otherMonthlyIncome: nonNegativeAssumption,
  preMoneyValuation: optionalAssumptionSchema,
});

const rating = z.number().min(1).max(5);

export const validationAssessmentSchema = z.object({
  problemPain: rating,
  problemFrequency: rating,
  problemAlreadySpendingMoney: rating,
  customersInterviewed: rating,
  hasUsers: rating,
  hasPayingCustomers: rating,
  hasSignedLois: rating,
  customersRequestedSolution: rating,
  technicallyFeasible: rating,
  mvpDifficulty: rating,
  productDifferentiation: rating,
  knowsHowToReachCustomers: rating,
  hasAudience: rating,
  hasPartnerships: rating,
  hasUnfairDistributionAdvantage: rating,
  competitionIntensity: rating,
  differentiationStrength: rating,
  switchingEase: rating,
});

export const teamAssessmentSchema = z.object({
  domainExpertise: rating,
  technicalAbility: rating,
  salesCapability: rating,
  marketingCapability: rating,
  founderCommitment: rating,
  industryRelationships: rating,
  accessToCapital: rating,
});

export const riskAssessmentSchema = z.object({
  technicalRisk: rating,
  marketRisk: rating,
  regulatoryRisk: rating,
  competitiveRisk: rating,
  financialRisk: rating,
  dependencyRisk: rating,
});

export const pitchSchema = z.object({
  problemStatement: z.string(),
  competitiveLandscape: z.string(),
  traction: z.string(),
  teamBios: z.string(),
  vision: z.string(),
  fundingAsk: assumptionSchema,
  useOfFunds: z.string(),
  tractionHistory: z.array(tractionDataPointSchema).optional(),
  teamMembers: z.array(pitchTeamMemberSchema).optional(),
  competitors: z.array(pitchCompetitorSchema).optional(),
  round: pitchRoundDetailsSchema.optional(),
});

export const projectFormSchema = z.object({
  basicInfo: basicInfoSchema,
  market: marketSchema,
  pricing: pricingSchema,
  marketplace: marketplaceSchema.optional(),
  acquisition: acquisitionSchema,
  retention: retentionSchema,
  unitEconomics: unitEconomicsSchema,
  costs: costsSchema,
  funding: fundingSchema,
  validation: validationAssessmentSchema,
  team: teamAssessmentSchema,
  risk: riskAssessmentSchema,
  pitch: pitchSchema,
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const projectDocumentSchema = projectFormSchema.extend({
  id: z.string().min(1),
  schemaVersion: z.number().int().positive().default(1),
  revision: z.number().int().positive().default(1),
  // PostgreSQL/PostgREST serializes `timestamptz` values with a numeric UTC
  // offset (for example, `+00:00`) rather than the trailing `Z` produced by
  // Date#toISOString. Both forms are valid ISO 8601 timestamps.
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

export type ProjectDocument = z.infer<typeof projectDocumentSchema>;

/** Field paths (dot notation) that belong to each wizard step, used for per-step validation via RHF's trigger(). */
export const STEP_FIELDS: Record<string, string[]> = {
  basicInfo: ["basicInfo"],
  market: ["market"],
  pricing: ["pricing"],
  marketplace: ["marketplace"],
  acquisition: ["acquisition"],
  retention: ["retention"],
  unitEconomics: ["unitEconomics"],
  costs: ["costs"],
  funding: ["funding"],
  validation: ["validation"],
  team: ["team"],
  risk: ["risk"],
  pitch: ["pitch"],
};
