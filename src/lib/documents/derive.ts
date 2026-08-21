import { val, normalizeToMonthlyArpu } from "@/lib/calculations/helpers";
import { getActiveRevenueStreams } from "@/lib/calculations/revenueStreams";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { BILLING_PERIOD_LABELS, BUSINESS_MODEL_LABELS, REVENUE_STREAM_KIND_LABELS } from "@/lib/constants";
import { getArchetype } from "@/lib/documents/businessModelArchetype";
import type { ComputedRow } from "@/lib/documents/sections";
import type { Assumption, DecisionVerdict, PilotDecision, Project, RevenueStream, ValuePropAssumptions } from "@/types";

export interface UnverifiedAssumption {
  /** Translation key for the assumption's label. */
  label: string;
  value: number;
  quality: "estimated" | "unknown";
}

/**
 * Every numeric Assumption on the project worth flagging as a guess to
 * validate. The flat `pricing.productPrice` entry is only relevant when it's
 * actually the operative pricing model — a hybrid project's real assumptions
 * to validate are its per-stream prices instead.
 */
function collectAssumptions(project: Project): Array<{ label: string; assumption: Assumption<number> | undefined }> {
  const activeStreams = getActiveRevenueStreams(project);
  const pricingEntries: Array<{ label: string; assumption: Assumption<number> | undefined }> =
    activeStreams.length > 0
      ? activeStreams.map((s) => ({ label: `${s.name || "Revenue stream"} price`, assumption: s.price }))
      : [{ label: "Product price", assumption: project.pricing.productPrice }];

  return [
    { label: "Total potential customers", assumption: project.market.totalPotentialCustomers },
    { label: "Average annual customer spend", assumption: project.market.averageAnnualCustomerSpend },
    { label: "Addressable market %", assumption: project.market.addressableMarketPct },
    { label: "Obtainable market %", assumption: project.market.obtainableMarketPct },
    { label: "Target customers", assumption: project.market.targetCustomers },
    ...pricingEntries,
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

/** One-Pager "Key assumptions", as rows for the shared computed-section renderer. */
export function deriveKeyAssumptionRows(project: Project): ComputedRow[] {
  return getUnverifiedAssumptions(project).map((a) => ({
    label: a.label,
    value: a.value.toLocaleString("en-US"),
    quality: a.quality,
  }));
}

/** One-Pager "Market Snapshot" — surfaces sizing already entered in the Market step. */
export function deriveMarketSnapshot(project: Project): ComputedRow[] {
  const m = project.market;
  return [
    { label: "Target customers", value: val(m.targetCustomers).toLocaleString("en-US"), quality: m.targetCustomers.quality },
    { label: "Addressable market", value: formatPercentage(val(m.addressableMarketPct)), quality: m.addressableMarketPct.quality },
    { label: "Obtainable market", value: formatPercentage(val(m.obtainableMarketPct)), quality: m.obtainableMarketPct.quality },
  ];
}

/**
 * Pricing display shared by every business document (One-Pager, Value & Offer,
 * Financial Model) — a project can make money more than one way (audit +
 * implementation + platform + usage + support), so the revenue mix takes
 * priority over the single-price model whenever at least one stream carries
 * real data (same "active" test the calculation engine uses in
 * calculateRevenueMix). Falls back to archetype-aware single pricing —
 * GMV/take-rate framing for marketplaces, price/billing otherwise — only
 * when there is no hybrid mix to show. Customer counts are deliberately left
 * out here since they come from `pricing` regardless of which model is
 * active — callers that want them append their own row.
 */
export function derivePricingRows(project: Project): ComputedRow[] {
  const currency = project.basicInfo.currency;

  const activeStreams = getActiveRevenueStreams(project);
  if (activeStreams.length > 0) {
    return activeStreams.map((s) => ({
      label: s.name || "Revenue stream",
      value: `${formatCurrency(val(s.price), currency)} (${REVENUE_STREAM_KIND_LABELS[s.kind]})`,
      quality: s.price.quality,
    }));
  }

  if (getArchetype(project.basicInfo.businessModel) === "marketplace") {
    const mp = project.marketplace;
    return [
      { label: "Average order value", value: formatCurrency(val(mp?.averageOrderValue), currency), quality: mp?.averageOrderValue.quality },
      { label: "Take rate", value: formatPercentage(val(mp?.takeRatePct)), quality: mp?.takeRatePct.quality },
      {
        label: "Transactions / customer / month",
        value: val(mp?.transactionsPerCustomerPerMonth).toLocaleString("en-US"),
        quality: mp?.transactionsPerCustomerPerMonth.quality,
      },
    ];
  }

  return [
    { label: "Price", value: formatCurrency(val(project.pricing.productPrice), currency), quality: project.pricing.productPrice.quality },
    { label: "Billing", value: BILLING_PERIOD_LABELS[project.pricing.billingPeriod] },
  ];
}

/** One-Pager "Business Model & Pricing" — the model label plus the shared pricing rows, with a current-customers row appended only when the flat single-price model is the one in effect (streams and marketplace rows already carry their own customer-facing figures). */
export function deriveBusinessModelSnapshot(project: Project): ComputedRow[] {
  const modelRow: ComputedRow = { label: "Model", value: BUSINESS_MODEL_LABELS[project.basicInfo.businessModel] };
  const pricingRows = derivePricingRows(project);

  const hasActiveStreams = getActiveRevenueStreams(project).length > 0;
  const isMarketplace = getArchetype(project.basicInfo.businessModel) === "marketplace";
  if (hasActiveStreams || isMarketplace) {
    return [modelRow, ...pricingRows];
  }

  return [
    modelRow,
    ...pricingRows,
    { label: "Current customers", value: val(project.pricing.currentCustomers).toLocaleString("en-US"), quality: project.pricing.currentCustomers.quality },
  ];
}

/** One-Pager "Traction & Validation" — the most concrete evidence on hand: a pilot outcome, else planned interviews, else an honest "not yet" status. */
export function deriveTractionSnapshot(project: Project): ComputedRow[] {
  const decision = project.pilotReport?.decision;
  if (decision) {
    const label = decision.charAt(0).toUpperCase() + decision.slice(1);
    return [{ label: "Pilot decision", value: label }];
  }
  const targetInterviews = project.validationPlan?.targetInterviews;
  if (targetInterviews) {
    return [{ label: "Validation interviews planned", value: targetInterviews.toLocaleString("en-US") }];
  }
  return [];
}

/** One-Pager "Funding Snapshot" — the ask and runway math, from Pitch and Funding & runway. */
export function deriveFundingSnapshot(project: Project): ComputedRow[] {
  const currency = project.basicInfo.currency;
  const rows: ComputedRow[] = [];
  const ask = project.pitch?.fundingAsk;
  if (ask && val(ask) > 0) rows.push({ label: "Funding ask", value: formatCurrency(val(ask), currency), quality: ask.quality });
  const months = project.funding.monthsToMilestone;
  if (months && val(months) > 0) rows.push({ label: "Months to milestone", value: val(months).toLocaleString("en-US"), quality: months.quality });
  const buffer = project.funding.safetyBufferMonths;
  if (buffer && val(buffer) > 0) rows.push({ label: "Safety buffer (months)", value: val(buffer).toLocaleString("en-US"), quality: buffer.quality });
  return rows;
}

export interface InterviewQuestionSuggestion {
  /** Translation-key template, in the same {template, params} shape as DecisionReason — `label` travels as a translation key and must be resolved via t() before interpolation (see translateReason). */
  template: string;
  params: { label: string; value: number };
}

/** One deterministic interview-question template per unverified assumption. */
export function suggestInterviewQuestions(unverified: UnverifiedAssumption[]): InterviewQuestionSuggestion[] {
  return unverified.map((a) => ({
    template: 'How does "{label}" (currently assumed at {value}) actually hold up with our real customers?',
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

/** One bullet per active revenue stream, shared by the proposal template and payment terms defaults below. */
function formatStreamPricingLines(project: Project, activeStreams: RevenueStream[]): string[] {
  const currency = project.basicInfo.currency;
  return activeStreams.map(
    (s) => `- ${s.name || "Revenue stream"}: ${formatCurrency(val(s.price), currency)} (${REVENUE_STREAM_KIND_LABELS[s.kind]})`
  );
}

/** Default Sales Documents "Proposal/quotation template" pre-filled with the project's own pricing — the revenue mix when at least one stream is active, else the single price. */
export function suggestProposalTemplate(project: Project): string {
  const activeStreams = getActiveRevenueStreams(project);
  const pricingBlock =
    activeStreams.length > 0
      ? ["Pricing:", ...formatStreamPricingLines(project, activeStreams)].join("\n")
      : (() => {
          const currency = project.basicInfo.currency;
          const price = val(project.pricing.productPrice);
          const billing = BILLING_PERIOD_LABELS[project.pricing.billingPeriod];
          const monthly = normalizeToMonthlyArpu(price, project.pricing.billingPeriod);
          return `Price: ${formatCurrency(price, currency)} (${billing})${monthly !== price ? ` — ${formatCurrency(monthly, currency)}/mo equivalent` : ""}`;
        })();
  return [
    `Proposal for ${project.basicInfo.name || "this engagement"}`,
    "",
    pricingBlock,
    "",
    "Scope: [fill in from our Value Proposition and MVP Scope documents]",
    "Timeline: [fill in]",
    "Next steps: [fill in]",
  ].join("\n");
}

/** Default Contract/Terms "Payment" clause pre-filled with the project's own pricing — the revenue mix when at least one stream is active, else the single price. */
export function suggestPaymentTerms(project: Project): string {
  const activeStreams = getActiveRevenueStreams(project);
  if (activeStreams.length > 0) {
    return [
      "Pricing:",
      ...formatStreamPricingLines(project, activeStreams),
      "",
      "[fill in invoicing method and due date per stream]",
    ].join("\n");
  }
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
