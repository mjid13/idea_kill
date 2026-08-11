import type { BillingPeriod, BusinessModel, Currency, FundingRoundType } from "@/types";

export const BUSINESS_MODEL_OPTIONS: Array<{ value: BusinessModel; label: string }> = [
  { value: "saas", label: "SaaS" },
  { value: "subscription", label: "Subscription" },
  { value: "marketplace", label: "Marketplace" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "one_time", label: "One-time purchase" },
  { value: "service", label: "Service" },
  { value: "usage_based", label: "Usage-based" },
  { value: "other", label: "Other" },
];

export const CURRENCY_OPTIONS: Array<{ value: Currency; label: string }> = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "OMR", label: "OMR — Omani Rial" },
  { value: "SAR", label: "SAR — Saudi Riyal" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
];

export const BILLING_PERIOD_OPTIONS: Array<{ value: BillingPeriod; label: string }> = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
  { value: "one_time", label: "One-time" },
  { value: "usage_based", label: "Usage-based" },
];

export const BUSINESS_MODEL_LABELS: Record<BusinessModel, string> = Object.fromEntries(
  BUSINESS_MODEL_OPTIONS.map((o) => [o.value, o.label])
) as Record<BusinessModel, string>;

export const CURRENCY_LABELS: Record<Currency, string> = Object.fromEntries(
  CURRENCY_OPTIONS.map((o) => [o.value, o.label])
) as Record<Currency, string>;

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = Object.fromEntries(
  BILLING_PERIOD_OPTIONS.map((o) => [o.value, o.label])
) as Record<BillingPeriod, string>;

export const FUNDING_ROUND_OPTIONS: Array<{ value: FundingRoundType; label: string }> = [
  { value: "pre_seed", label: "Pre-seed" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b_plus", label: "Series B+" },
  { value: "bridge", label: "Bridge" },
];

export const FUNDING_ROUND_LABELS: Record<FundingRoundType, string> = Object.fromEntries(
  FUNDING_ROUND_OPTIONS.map((o) => [o.value, o.label])
) as Record<FundingRoundType, string>;
