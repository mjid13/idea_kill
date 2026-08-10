import { known, unknownValue, type Project } from "@/types";

/**
 * Pre-populated example project (spec section 28) so a new user can load a
 * realistic B2B SaaS scenario and understand the tool immediately.
 */
export const EXAMPLE_PROJECT_ID = "example-b2b-saas";

export const exampleProject: Project = {
  id: EXAMPLE_PROJECT_ID,
  createdAt: "2026-01-15T00:00:00.000Z",
  updatedAt: "2026-01-15T00:00:00.000Z",
  basicInfo: {
    name: "B2B SaaS — Example",
    description:
      "A workflow automation tool for small accounting firms. Helps teams eliminate manual data entry between client bookkeeping systems.",
    businessModel: "saas",
    currency: "USD",
  },
  market: {
    totalPotentialCustomers: known(100000),
    averageAnnualCustomerSpend: known(600),
    addressableMarketPct: known(20),
    obtainableMarketPct: known(5),
    targetCustomers: known(300),
  },
  pricing: {
    productPrice: known(50),
    billingPeriod: "monthly",
    currentCustomers: known(50),
    expectedCustomers12mo: known(300),
    expectedMonthlyCustomerGrowthPct: known(8),
    freeToPaidConversionPct: known(12),
  },
  acquisition: {
    monthlyMarketingSpend: known(4000),
    monthlySalesSpend: known(2000),
    newCustomersAcquiredMonthly: known(30),
    monthlyLeads: known(400),
    leadToCustomerConversionPct: unknownValue(0),
  },
  retention: {
    monthlyChurnPct: known(3),
    annualChurnPct: unknownValue(0),
    averageCustomerLifetimeMonths: unknownValue(0),
  },
  unitEconomics: {
    revenuePerCustomer: known(50),
    directCostPerCustomer: known(8),
    paymentProcessingPct: known(2.9),
    infrastructureCostPerCustomer: known(3),
    supportCostPerCustomer: known(2),
    otherVariableCostPerCustomer: known(0),
  },
  costs: {
    founderSalaries: known(0),
    employeeSalaries: known(0),
    contractorExpenses: known(1500),
    officeExpenses: known(0),
    infrastructure: known(800),
    softwareSubscriptions: known(300),
    marketing: known(4000),
    sales: known(2000),
    legalAccounting: known(400),
    otherMonthlyExpenses: known(500),
  },
  funding: {
    availableCash: known(100000),
    initialInvestment: known(0),
    otherMonthlyIncome: known(0),
  },
  validation: {
    problemPain: 4,
    problemFrequency: 4,
    problemAlreadySpendingMoney: 3,
    customersInterviewed: 4,
    hasUsers: 4,
    hasPayingCustomers: 3,
    hasSignedLois: 2,
    customersRequestedSolution: 3,
    technicallyFeasible: 5,
    mvpDifficulty: 3,
    productDifferentiation: 3,
    knowsHowToReachCustomers: 3,
    hasAudience: 2,
    hasPartnerships: 2,
    hasUnfairDistributionAdvantage: 2,
    competitionIntensity: 3,
    differentiationStrength: 3,
    switchingEase: 3,
  },
  team: {
    domainExpertise: 4,
    technicalAbility: 4,
    salesCapability: 3,
    marketingCapability: 3,
    founderCommitment: 5,
    industryRelationships: 3,
    accessToCapital: 3,
  },
  risk: {
    technicalRisk: 2,
    marketRisk: 2,
    regulatoryRisk: 1,
    competitiveRisk: 3,
    financialRisk: 2,
    dependencyRisk: 2,
  },
};
