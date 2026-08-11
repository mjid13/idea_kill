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
  pitch: {
    problemStatement:
      "Small accounting firms lose 8-10 hours a week per staff member manually re-keying transactions between client bookkeeping systems and their own practice software. That's billable time lost to copy-paste work, and it doesn't scale as firms take on more clients.",
    competitiveLandscape:
      "Generic RPA tools (Zapier, Make) require technical setup firms don't have time for. Practice-management suites (Karbon, Financial Cent) bundle workflow but don't solve cross-system data sync. We're the first tool purpose-built for accounting-specific system pairs, with zero-config templates for the top 12 bookkeeping platforms.",
    traction:
      "50 paying firms at $50/mo, 3% monthly churn. 400 inbound leads/month from a content-led funnel, 30 converting to paying customers. Contractor-run support and infra at $2.6K/mo combined — no full-time hires yet.",
    teamBios:
      "Founder: 6 years as a senior accountant at a 40-person firm before starting this; built the first version to solve her own team's workflow. Technical co-founder: ex-fintech engineer, shipped two B2B SaaS integrations platforms previously.",
    vision:
      "Become the default automation layer between every small accounting firm and the systems their clients already use — expanding from data sync into full workflow automation over the next 3 years.",
    fundingAsk: known(250000),
    useOfFunds:
      "60% engineering (2 hires to build out the integration library), 25% sales & marketing (scale the content funnel that's already converting), 15% runway buffer.",
    tractionHistory: [
      { id: "t1", label: "Month 1", customers: 8, mrr: 400 },
      { id: "t2", label: "Month 2", customers: 15, mrr: 750 },
      { id: "t3", label: "Month 3", customers: 24, mrr: 1200 },
      { id: "t4", label: "Month 4", customers: 34, mrr: 1700 },
      { id: "t5", label: "Month 5", customers: 42, mrr: 2100 },
      { id: "t6", label: "Month 6", customers: 50, mrr: 2500 },
    ],
    teamMembers: [
      {
        id: "m1",
        name: "Amina Al-Rashdi",
        role: "Founder & CEO",
        bio: "6 years as a senior accountant at a 40-person firm before starting this; built the first version to solve her own team's workflow.",
      },
      {
        id: "m2",
        name: "Yusuf Al-Balushi",
        role: "Co-founder & CTO",
        bio: "Ex-fintech engineer, shipped two B2B SaaS integration platforms previously.",
      },
    ],
    competitors: [
      { id: "c1", name: "Zapier / Make", edge: "Zero-config templates for accounting-specific system pairs — no technical setup required." },
      { id: "c2", name: "Karbon, Financial Cent", edge: "We solve cross-system data sync directly; they bundle general workflow but don't touch this problem." },
    ],
    round: {
      roundType: "seed",
      valuation: 3000000,
      previousInvestors: "Pre-seed: $50K from a regional accelerator.",
    },
  },
};
