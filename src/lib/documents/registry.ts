export type DocumentGroup = "validate" | "build" | "sell" | "decide";

export type DocumentSlug =
  | "one-pager"
  | "icp"
  | "value-prop"
  | "validation-plan"
  | "financial-model"
  | "mvp-scope"
  | "gtm-plan"
  | "sales-docs"
  | "contract-terms"
  | "pilot-report";

export interface DocumentMeta {
  slug: DocumentSlug;
  title: string;
  description: string;
  group: DocumentGroup;
  /** Financial Model is fully computed — view only, no edit form. */
  hasEdit: boolean;
}

export const DOCUMENT_GROUP_LABELS: Record<DocumentGroup, string> = {
  validate: "Validate",
  build: "Build",
  sell: "Sell",
  decide: "Decide",
};

export const DOCUMENT_REGISTRY: DocumentMeta[] = [
  {
    slug: "one-pager",
    title: "Business One-Pager",
    description: "Problem, customer, solution, business model, differentiation, and key assumptions on a single page.",
    group: "validate",
    hasEdit: true,
  },
  {
    slug: "icp",
    title: "ICP Document",
    description: "Exact customer profile, buyer/decision maker, pain points, current alternatives, and buying triggers.",
    group: "validate",
    hasEdit: true,
  },
  {
    slug: "value-prop",
    title: "Value Proposition & Offer",
    description: "What you sell, the customer outcome, scope, pricing, and why buy now.",
    group: "validate",
    hasEdit: true,
  },
  {
    slug: "validation-plan",
    title: "Customer Validation Plan",
    description: "Assumptions to test, interview questions, target interviews, and success/failure criteria.",
    group: "validate",
    hasEdit: true,
  },
  {
    slug: "financial-model",
    title: "Financial Model",
    description: "Pricing, costs, CAC, LTV, gross margin, break-even, and cash required — pulled from your assumptions automatically.",
    group: "validate",
    hasEdit: false,
  },
  {
    slug: "mvp-scope",
    title: "MVP / Product Scope",
    description: "Must-have functionality, what's explicitly excluded, user flow, and acceptance criteria.",
    group: "build",
    hasEdit: true,
  },
  {
    slug: "gtm-plan",
    title: "Go-To-Market Plan",
    description: "Acquisition channels, sales process, messaging, initial prospect list, and sales targets.",
    group: "build",
    hasEdit: true,
  },
  {
    slug: "sales-docs",
    title: "Sales Documents",
    description: "Sales one-pager/deck, demo script, proposal/quotation template, and FAQ / objection handling.",
    group: "sell",
    hasEdit: true,
  },
  {
    slug: "contract-terms",
    title: "Contract / Terms",
    description: "Scope, payment, IP, liability, cancellation, and support terms.",
    group: "sell",
    hasEdit: true,
  },
  {
    slug: "pilot-report",
    title: "Pilot / Experiment Report",
    description: "Who was contacted, what happened, sales results, customer feedback, updated assumptions, and the continue/pivot/kill decision.",
    group: "decide",
    hasEdit: true,
  },
];
