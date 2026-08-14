import { val, normalizeToMonthlyArpu } from "@/lib/calculations/helpers";
import { formatCurrency } from "@/lib/format";
import { BILLING_PERIOD_LABELS } from "@/lib/constants";
import type { Assumption, DecisionVerdict, PilotDecision, Project, ValuePropAssumptions } from "@/types";

export interface UnverifiedAssumption {
  /** Translation key for the assumption's label. */
  label: string;
  value: number;
  quality: "estimated" | "unknown";
}

/** Every numeric Assumption on the project worth flagging as a guess to validate. */
function collectAssumptions(project: Project): Array<{ label: string; assumption: Assumption<number> | undefined }> {
  return [
    { label: "Total potential customers", assumption: project.market.totalPotentialCustomers },
    { label: "Average annual customer spend", assumption: project.market.averageAnnualCustomerSpend },
    { label: "Addressable market %", assumption: project.market.addressableMarketPct },
    { label: "Obtainable market %", assumption: project.market.obtainableMarketPct },
    { label: "Target customers", assumption: project.market.targetCustomers },
    { label: "Product price", assumption: project.pricing.productPrice },
    { label: "Current customers", assumption: project.pricing.currentCustomers },
    { label: "Expected customers in 12 months", assumption: project.pricing.expectedCustomers12mo },
    { label: "Expected monthly customer growth %", assumption: project.pricing.expectedMonthlyCustomerGrowthPct },
    { label: "Monthly marketing spend", assumption: project.acquisition.monthlyMarketingSpend },
    { label: "Monthly sales spend", assumption: project.acquisition.monthlySalesSpend },
    { label: "New customers acquired monthly", assumption: project.acquisition.newCustomersAcquiredMonthly },
    { label: "Monthly churn %", assumption: project.retention.monthlyChurnPct },
    { label: "Revenue per customer", assumption: project.unitEconomics.revenuePerCustomer },
    { label: "Direct cost per customer", assumption: project.unitEconomics.directCostPerCustomer },
    { label: "Available cash", assumption: project.funding.availableCash },
  ];
}

/**
 * Powers both the One-Pager's "Key assumptions" and the Validation Plan's
 * "Assumptions to test" from the same source — an assumption flagged
 * "estimated" or "unknown" anywhere in the project is, by definition, a
 * guess the idea currently depends on.
 */
export function getUnverifiedAssumptions(project: Project): UnverifiedAssumption[] {
  return collectAssumptions(project)
    .filter((e): e is { label: string; assumption: Assumption<number> } => !!e.assumption && e.assumption.quality !== "known")
    .map((e) => ({ label: e.label, value: val(e.assumption), quality: e.assumption.quality as "estimated" | "unknown" }));
}

export interface InterviewQuestionSuggestion {
  /** Translation-key template, in the same {template, params} shape as DecisionReason — `label` travels as a translation key and must be resolved via t() before interpolation (see translateReason). */
  template: string;
  params: { label: string; value: number };
}

/** One deterministic interview-question template per unverified assumption. */
export function suggestInterviewQuestions(unverified: UnverifiedAssumption[]): InterviewQuestionSuggestion[] {
  return unverified.map((a) => ({
    template: 'How does "{label}" (currently assumed at {value}) actually hold up with your real customers?',
    params: { label: a.label, value: a.value },
  }));
}

/** Names of competitors already entered in the pitch deck, for ICP "Current alternatives". */
export function suggestCurrentAlternatives(project: Project): string | undefined {
  const names = project.pitch?.competitors?.map((c) => c.name).filter(Boolean) ?? [];
  return names.length > 0 ? names.join(", ") : undefined;
}

/** Drafts GTM "Messaging" from the Value Proposition fields, so the pitch doesn't have to be written twice. */
export function composeMessaging(valueProp: ValuePropAssumptions | undefined): string | undefined {
  const parts = [valueProp?.whatYouSell, valueProp?.customerOutcome, valueProp?.whyBuyNow].filter(
    (p): p is string => !!p && p.trim().length > 0
  );
  return parts.length > 0 ? parts.join(" ") : undefined;
}

/** Default GTM "Sales targets" — the 12-month customer target already entered in Pricing & customers. */
export function suggestSalesTargets(project: Project): number | undefined {
  const target = val(project.pricing.expectedCustomers12mo);
  return target > 0 ? target : undefined;
}

/** Default Sales Documents "Proposal/quotation template" pre-filled with the project's own pricing. */
export function suggestProposalTemplate(project: Project): string {
  const currency = project.basicInfo.currency;
  const price = val(project.pricing.productPrice);
  const billing = BILLING_PERIOD_LABELS[project.pricing.billingPeriod];
  const monthly = normalizeToMonthlyArpu(price, project.pricing.billingPeriod);
  return [
    `Proposal for ${project.basicInfo.name || "this engagement"}`,
    "",
    `Price: ${formatCurrency(price, currency)} (${billing})${monthly !== price ? ` — ${formatCurrency(monthly, currency)}/mo equivalent` : ""}`,
    "",
    "Scope: [fill in from your Value Proposition and MVP Scope documents]",
    "Timeline: [fill in]",
    "Next steps: [fill in]",
  ].join("\n");
}

/** Default Contract/Terms "Payment" clause pre-filled with the project's own pricing. */
export function suggestPaymentTerms(project: Project): string {
  const currency = project.basicInfo.currency;
  const price = val(project.pricing.productPrice);
  const billing = BILLING_PERIOD_LABELS[project.pricing.billingPeriod];
  return `${formatCurrency(price, currency)}, billed ${billing.toLowerCase()}. [fill in invoicing method and due date]`;
}

/** Default Pilot Report "Who was contacted" — the company names already entered in the GTM prospect list. */
export function suggestWhoContacted(project: Project): string | undefined {
  const names = project.gtmPlan?.prospectList?.map((p) => p.company).filter(Boolean) ?? [];
  return names.length > 0 ? names.join(", ") : undefined;
}

/** Maps the viability engine's own verdict to a default Pilot Report decision — the app's closing recommendation, still overridable. */
export function suggestPilotDecision(verdict: DecisionVerdict): PilotDecision {
  switch (verdict) {
    case "strong_candidate":
      return "continue";
    case "high_risk":
      return "kill";
    case "explore_further":
    case "validate_before_building":
    case "improve_economics":
    default:
      return "pivot";
  }
}
