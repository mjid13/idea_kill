import {
  estimated,
  unknownValue,
  type BusinessModel,
  type Currency,
  type Project,
  type RevenueStream,
  type RevenueStreamKind,
} from "@/types";

export function createProjectId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const id = createProjectId;

const u0 = () => unknownValue(0);

/** A fresh project with every numeric assumption marked "unknown" until the user fills it in. */
export function createEmptyProject(businessModel: BusinessModel = "saas", currency: Currency = "USD"): Project {
  const now = new Date().toISOString();
  return {
    id: id(),
    schemaVersion: 1,
    revision: 1,
    createdAt: now,
    updatedAt: now,
    basicInfo: { name: "", description: "", businessModel, currency },
    market: {
      totalPotentialCustomers: u0(),
      averageAnnualCustomerSpend: u0(),
      addressableMarketPct: u0(),
      obtainableMarketPct: u0(),
      sizingMethod: "simple",
      funnel: defaultMarketFunnel(),
      targetCustomers: u0(),
    },
    pricing: {
      productPrice: u0(),
      billingPeriod: "monthly",
      currentCustomers: u0(),
      expectedCustomers12mo: u0(),
      expectedMonthlyCustomerGrowthPct: u0(),
      freeToPaidConversionPct: u0(),
      topCustomersRevenueSharePct: u0(),
    },
    revenueStreams: emptyRevenueStreams(),
    marketplace: emptyMarketplace(),
    acquisition: {
      monthlyMarketingSpend: u0(),
      monthlySalesSpend: u0(),
      newCustomersAcquiredMonthly: u0(),
      monthlyLeads: u0(),
      leadToCustomerConversionPct: u0(),
    },
    retention: {
      monthlyChurnPct: u0(),
      annualChurnPct: u0(),
      averageCustomerLifetimeMonths: u0(),
      monthlyExpansionRevenuePct: u0(),
      monthlyContractionRevenuePct: u0(),
    },
    unitEconomics: {
      revenuePerCustomer: u0(),
      directCostPerCustomer: u0(),
      paymentProcessingPct: u0(),
      infrastructureCostPerCustomer: u0(),
      supportCostPerCustomer: u0(),
      otherVariableCostPerCustomer: u0(),
    },
    costs: {
      founderSalaries: u0(),
      employeeSalaries: u0(),
      contractorExpenses: u0(),
      officeExpenses: u0(),
      infrastructure: u0(),
      softwareSubscriptions: u0(),
      marketing: u0(),
      sales: u0(),
      legalAccounting: u0(),
      otherMonthlyExpenses: u0(),
    },
    funding: {
      availableCash: u0(),
      initialInvestment: u0(),
      otherMonthlyIncome: u0(),
      preMoneyValuation: u0(),
      ...fundingRequirementDefaults(),
    },
    debt: emptyDebt(),
    validation: {
      problemPain: 3,
      problemFrequency: 3,
      problemAlreadySpendingMoney: 3,
      customersInterviewed: 1,
      hasUsers: 1,
      hasPayingCustomers: 1,
      hasSignedLois: 1,
      customersRequestedSolution: 1,
      technicallyFeasible: 3,
      mvpDifficulty: 3,
      productDifferentiation: 3,
      knowsHowToReachCustomers: 3,
      hasAudience: 1,
      hasPartnerships: 1,
      hasUnfairDistributionAdvantage: 1,
      competitionIntensity: 3,
      differentiationStrength: 3,
      switchingEase: 3,
    },
    team: {
      domainExpertise: 3,
      technicalAbility: 3,
      salesCapability: 3,
      marketingCapability: 3,
      founderCommitment: 3,
      industryRelationships: 3,
      accessToCapital: 3,
    },
    risk: {
      technicalRisk: 3,
      marketRisk: 3,
      regulatoryRisk: 2,
      competitiveRisk: 3,
      financialRisk: 3,
      dependencyRisk: 2,
    },
    pitch: emptyPitch(),
    onePager: emptyOnePager(),
    icp: emptyIcp(),
    valueProp: emptyValueProp(),
    validationPlan: emptyValidationPlan(),
    mvpScope: emptyMvpScope(),
    gtmPlan: emptyGtmPlan(),
    salesDocs: emptySalesDocs(),
    contractTerms: emptyContractTerms(),
    pilotReport: emptyPilotReport(),
  };
}

/**
 * Defaults for the funding-requirement inputs, also used to backfill projects
 * saved before the requirement calculator existed. Seeded with the same
 * planning defaults the calculator falls back to (12-month milestone window,
 * 3-month buffer, 18% contingency) rather than pristine zeros, so a new
 * project produces a usable requirement before the founder touches the step.
 * Marked "estimated": these are planning conventions, not known facts.
 */
export function fundingRequirementDefaults() {
  return {
    monthsToMilestone: estimated(12),
    safetyBufferMonths: estimated(3),
    receivableDays: u0(),
    capex: u0(),
    contingencyPct: estimated(18),
  };
}

/**
 * Defaults for the debt-financing inputs behind Lender Mode, also used to
 * backfill projects saved before it existed. Seeded with the conventions a
 * commercial lender underwrites to — a 5-year term, 1.25x minimum coverage, and
 * a 30% revenue haircut for the downside case — rather than pristine zeros, so
 * a schedule and a DSCR exist before the founder touches the form. Marked
 * "estimated": these are lending conventions, not this bank's actual terms.
 */
export function emptyDebt() {
  return {
    loanAmount: u0(),
    annualInterestRatePct: u0(),
    termMonths: estimated(60),
    gracePeriodMonths: u0(),
    existingMonthlyDebtService: u0(),
    founderContribution: u0(),
    collateralValue: u0(),
    collateralDescription: "",
    personalGuarantee: false,
    contractedMonthlyRevenue: u0(),
    targetDscr: estimated(1.25),
    downsideRevenueHaircutPct: estimated(30),
  };
}

/**
 * Starting scaffold for the bottom-up market funnel, also used to backfill
 * projects saved before it existed. The stages mirror how a B2B founder
 * actually narrows a market — geography, company size, sector, digital
 * maturity, workflow fit, budget, reachability — so the founder edits real
 * filters instead of inventing an "addressable %".
 *
 * Stage ids are fixed slugs, not generated: they are referenced by
 * samStageId/somStageId and addressed by MCP field paths, so they must survive
 * a reload and be identical across every project created from this scaffold.
 */
export function defaultMarketFunnel() {
  return {
    baseLabel: "Businesses in the target country",
    baseCount: u0(),
    stages: [
      { id: "company-size", label: "In the target company-size band", mode: "count" as const, value: u0() },
      { id: "sector", label: "In a relevant sector", mode: "count" as const, value: u0() },
      { id: "digital-maturity", label: "Digitally ready", mode: "count" as const, value: u0() },
      { id: "workflow-fit", label: "Workflow fits our product", mode: "count" as const, value: u0() },
      { id: "budget", label: "Has sufficient budget", mode: "count" as const, value: u0() },
      { id: "reachable", label: "Reachable, highly qualified accounts", mode: "count" as const, value: u0() },
    ],
    samStageId: "budget",
    somStageId: "reachable",
    winRatePct: u0(),
  };
}

/**
 * A blank revenue stream. Defaults describe the most common case — every
 * customer buys it (100% attach), one unit a month, sold monthly — so a founder
 * only has to type a name, a price and a delivery cost to get real numbers.
 */
export function emptyRevenueStream(kind: RevenueStreamKind = "recurring", name = ""): RevenueStream {
  return {
    id: id(),
    name,
    kind,
    price: u0(),
    billingPeriod: kind === "one_time" ? "one_time" : kind === "usage" ? "usage_based" : "monthly",
    attachRatePct: estimated(100),
    unitsPerCustomerPerMonth: estimated(1),
    takeRatePct: kind === "transactional" ? u0() : undefined,
    deliveryCostPct: u0(),
  };
}

/**
 * New projects start with no streams, which keeps the simple single-price model
 * in charge until the founder opts into a mix. Backfilled as `[]` (not
 * undefined) for older projects so the array is addressable via MCP.
 */
export function emptyRevenueStreams(): RevenueStream[] {
  return [];
}

/** Default empty marketplace GMV/take-rate content, also used to backfill projects saved before this slice existed. */
export function emptyMarketplace() {
  return {
    averageOrderValue: u0(),
    takeRatePct: u0(),
    transactionsPerCustomerPerMonth: u0(),
  };
}

/** Default empty pitch-narrative content, also used to backfill projects saved before this step existed. */
export function emptyPitch() {
  return {
    problemStatement: "",
    competitiveLandscape: "",
    traction: "",
    teamBios: "",
    vision: "",
    fundingAsk: u0(),
    useOfFunds: "",
  };
}

/**
 * Default empty content for the business-building documents, also used to
 * backfill projects saved before this feature existed. Kept present (not
 * undefined) unconditionally, like `emptyPitch`/`emptyMarketplace` above, so
 * every leaf field is addressable via MCP's `update_project` from creation —
 * `applyProjectChanges`'s allowlist only contains paths already present in
 * the parsed project, and Zod's `.optional()` omits absent keys entirely.
 */
export function emptyOnePager() {
  return { problem: "", customer: "", solution: "", differentiation: "" };
}

export function emptyIcp() {
  return { customerProfile: "", buyerDecisionMaker: "", painPoints: "", currentAlternatives: "", buyingTriggers: "" };
}

export function emptyValueProp() {
  return { whatYouSell: "", customerOutcome: "", scope: "", whyBuyNow: "" };
}

export function emptyValidationPlan() {
  return { interviewQuestions: [], targetInterviews: undefined, successFailureCriteria: "" };
}

export function emptyMvpScope() {
  return { mustHaveFunctionality: "", explicitlyExcluded: "", userFlow: "", acceptanceCriteria: [] };
}

export function emptyGtmPlan() {
  return { acquisitionChannels: "", salesProcess: "", messaging: "", prospectList: [], salesTargets: undefined };
}

export function emptySalesDocs() {
  return { demoScript: [], proposalTemplate: "", faq: [] };
}

export function emptyContractTerms() {
  return { scope: "", payment: "", ip: "", liability: "", cancellation: "", supportTerms: "" };
}

export function emptyPilotReport() {
  return { whoContacted: "", whatHappened: [], salesResults: "", customerFeedback: [], updatedAssumptions: [], decision: undefined };
}

export function duplicateProject(project: Project): Project {
  const now = new Date().toISOString();
  return {
    ...project,
    id: id(),
    revision: 1,
    createdAt: now,
    updatedAt: now,
    basicInfo: { ...project.basicInfo, name: `${project.basicInfo.name} (copy)` },
  };
}
