"use client";

import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Controller, useFieldArray, useWatch, type Control } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { AssumptionField } from "@/components/forms/AssumptionField";
import { ComputedField } from "@/components/forms/ComputedField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BILLING_PERIOD_LABELS,
  BILLING_PERIOD_OPTIONS,
  REVENUE_STREAM_KIND_LABELS,
  REVENUE_STREAM_KIND_OPTIONS,
  REVENUE_STREAM_PRESETS,
} from "@/lib/constants";
import { calculateRevenueMix } from "@/lib/calculations/revenueStreams";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { emptyRevenueStream } from "@/lib/storage/factory";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";
import type { BillingPeriod, RevenueStream, RevenueStreamKind } from "@/types";

/**
 * Per-kind field visibility. A recurring platform fee needs a billing period
 * but no unit count; metered usage needs units but no billing period; only a
 * transactional stream has a take rate. Showing every field for every kind
 * would ask founders to fill in numbers that are then ignored.
 */
const SHOWS_BILLING_PERIOD: RevenueStreamKind[] = ["recurring"];
const SHOWS_UNITS: RevenueStreamKind[] = ["usage", "transactional", "one_time"];
const SHOWS_TAKE_RATE: RevenueStreamKind[] = ["transactional"];

const UNIT_LABELS: Record<RevenueStreamKind, string> = {
  one_time: "Purchases per customer",
  recurring: "Units per customer per month",
  usage: "Billable units per customer per month",
  transactional: "Transactions per customer per month",
};

const PRICE_LABELS: Record<RevenueStreamKind, string> = {
  one_time: "Price per purchase",
  recurring: "Price per billing period",
  usage: "Price per unit",
  transactional: "Average transaction value",
};

function StreamCard({
  control,
  index,
  onRemove,
}: {
  control: Control<ProjectFormValues>;
  index: number;
  onRemove: () => void;
}) {
  const t = useAppTranslations();
  const kind = (useWatch({ control, name: `revenueStreams.${index}.kind` }) ?? "recurring") as RevenueStreamKind;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40 flex-1 space-y-1.5">
          <Label className="text-xs">{t("Stream name")}</Label>
          <Controller
            control={control}
            name={`revenueStreams.${index}.name`}
            render={({ field }) => <Input {...field} placeholder={t("e.g. Implementation")} />}
          />
        </div>
        <div className="min-w-40 flex-1 space-y-1.5">
          <Label className="text-xs">{t("Stream type")}</Label>
          <Controller
            control={control}
            name={`revenueStreams.${index}.kind`}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: RevenueStreamKind) => t(REVENUE_STREAM_KIND_LABELS[v])}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {REVENUE_STREAM_KIND_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {t(o.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRemove} aria-label={t("Remove stream")}>
          <Trash2 />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {t(REVENUE_STREAM_KIND_OPTIONS.find((o) => o.value === kind)?.description ?? "")}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AssumptionField
          control={control}
          name={`revenueStreams.${index}.price`}
          label={t(PRICE_LABELS[kind])}
          prefix="$"
          description={t("What we charge on this stream's own basis — the take rate below turns transaction value into revenue.")}
        />

        {SHOWS_BILLING_PERIOD.includes(kind) && (
          <div className="space-y-1.5">
            <Label className="text-xs">{t("Billing period")}</Label>
            <Controller
              control={control}
              name={`revenueStreams.${index}.billingPeriod`}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{(v: BillingPeriod) => t(BILLING_PERIOD_LABELS[v])}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_PERIOD_OPTIONS.filter((o) => o.value === "monthly" || o.value === "annual").map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {t(o.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}

        {SHOWS_UNITS.includes(kind) && (
          <AssumptionField
            control={control}
            name={`revenueStreams.${index}.unitsPerCustomerPerMonth`}
            label={t(UNIT_LABELS[kind])}
            step={0.5}
            description={t("How much of this stream the average attached customer consumes. Leave at 1 for a single flat charge.")}
          />
        )}

        {SHOWS_TAKE_RATE.includes(kind) && (
          <AssumptionField
            control={control}
            name={`revenueStreams.${index}.takeRatePct`}
            label={t("Take rate")}
            suffix="%"
            step={0.5}
            description={t("The % of each transaction's value that we keep as revenue.")}
          />
        )}

        <AssumptionField
          control={control}
          name={`revenueStreams.${index}.attachRatePct`}
          label={t("Attach rate")}
          suffix="%"
          step={5}
          description={t("% of customers who buy this stream. 100% means every customer takes it.")}
        />

        <AssumptionField
          control={control}
          name={`revenueStreams.${index}.deliveryCostPct`}
          label={t("Delivery cost")}
          suffix="%"
          step={5}
          description={t("Cost of delivering this stream as a % of its own revenue — consultant days for services, compute for AI usage. This is what separates a 90%-margin platform from a 40%-margin implementation.")}
        />
      </div>
    </div>
  );
}

/**
 * Hybrid revenue mix. A real company is rarely "a SaaS" or "a service" — it can
 * sell an audit, an implementation, a platform subscription, metered AI usage
 * and an enterprise support retainer at once. Each stream is priced and costed
 * separately here, and the engine blends them instead of averaging the business
 * into a single price with a single margin.
 */
export function RevenueStreamsStep({ control }: { control: Control<ProjectFormValues> }) {
  const t = useAppTranslations();
  const { fields, append, remove } = useFieldArray({ control, name: "revenueStreams" });

  const currency = useWatch({ control, name: "basicInfo.currency" });
  const streams = useWatch({ control, name: "revenueStreams" }) as RevenueStream[] | undefined;
  const currentCustomers = useWatch({ control, name: "pricing.currentCustomers.value" }) ?? 0;
  const newCustomers = useWatch({ control, name: "acquisition.newCustomersAcquiredMonthly.value" }) ?? 0;

  const mix = calculateRevenueMix(streams, {
    currentCustomers,
    newCustomersPerMonth: newCustomers,
  });

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        {t(
          "Optional. Add a stream for every distinct way we make money — an audit, an implementation project, a platform subscription, metered usage, an enterprise retainer. While this list is empty, the single price from the Pricing step drives the economics; once any stream has a price, the mix takes over."
        )}
      </p>

      {fields.length > 0 && (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <StreamCard key={field.id} control={control} index={index} onRemove={() => remove(index)} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => append(emptyRevenueStream())}>
          <Plus /> {t("Add revenue stream")}
        </Button>
        {REVENUE_STREAM_PRESETS.map((preset) => (
          <Button
            key={preset.name}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(emptyRevenueStream(preset.kind, t(preset.name)))}
          >
            <Plus /> {t(preset.name)}
          </Button>
        ))}
      </div>

      {mix && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ComputedField
            label={t("Monthly recurring revenue from the mix")}
            description={t("Subscription, usage and take-rate streams billed against the current customer base.")}
            formula={t("Sum of recurring streams x Current customers")}
            value={formatCurrency(mix.monthlyRecurringRevenue, currency)}
          />
          <ComputedField
            label={t("Monthly one-time revenue from the mix")}
            description={t("Audits, setup fees and implementation work billed to this month's newly acquired customers.")}
            formula={t("Sum of one-time streams x New customers per month")}
            value={formatCurrency(mix.monthlyOneTimeRevenue, currency)}
          />
          <ComputedField
            label={t("Recurring share of revenue")}
            description={t("How much of this month's revenue arrives again next month without selling anything new.")}
            formula={t("Recurring revenue / Total revenue")}
            value={formatPercentage(mix.recurringRevenueSharePct)}
          />
          <ComputedField
            label={t("Blended gross margin")}
            description={t("Revenue-weighted margin across every stream — high-margin software pulled down by lower-margin services, in the proportion we actually sell them.")}
            formula={t("Weighted average of each stream's margin")}
            value={formatPercentage(mix.blendedGrossMarginPct)}
          />
        </div>
      )}
    </div>
  );
}
