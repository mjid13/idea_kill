import { unknownValue, type BusinessModel, type Currency, type Project } from "@/types";

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
    createdAt: now,
    updatedAt: now,
    basicInfo: { name: "", description: "", businessModel, currency },
    market: {
      totalPotentialCustomers: u0(),
      averageAnnualCustomerSpend: u0(),
      addressableMarketPct: u0(),
      obtainableMarketPct: u0(),
      targetCustomers: u0(),
    },
    pricing: {
      productPrice: u0(),
      billingPeriod: "monthly",
      currentCustomers: u0(),
      expectedCustomers12mo: u0(),
      expectedMonthlyCustomerGrowthPct: u0(),
      freeToPaidConversionPct: u0(),
    },
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
    },
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
  };
}

export function duplicateProject(project: Project): Project {
  const now = new Date().toISOString();
  return {
    ...project,
    id: id(),
    createdAt: now,
    updatedAt: now,
    basicInfo: { ...project.basicInfo, name: `${project.basicInfo.name} (copy)` },
  };
}
