"use client";

import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Controller, useWatch, type Control } from "react-hook-form";
import { AssumptionField } from "@/components/forms/AssumptionField";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BILLING_PERIOD_LABELS, BILLING_PERIOD_OPTIONS } from "@/lib/constants";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";
import type { BillingPeriod, BusinessModel } from "@/types";

const FREEMIUM_ELIGIBLE_MODELS: BusinessModel[] = ["saas", "subscription", "usage_based"];

export function PricingStep({ control }: { control: Control<ProjectFormValues> }) {
  const t = useAppTranslations();
  const businessModel = useWatch({ control, name: "basicInfo.businessModel" });
  const showFreeToPaidConversion = FREEMIUM_ELIGIBLE_MODELS.includes(businessModel);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AssumptionField control={control} name="pricing.productPrice" label={t("Product price")} prefix="$" description={t("The price charged per billing period.")} />
        <div className="space-y-1.5">
          <Label className="text-xs">{t("Billing period")}</Label>
          <Controller
            control={control}
            name="pricing.billingPeriod"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: BillingPeriod) => t(BILLING_PERIOD_LABELS[v])}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {BILLING_PERIOD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {t(o.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AssumptionField control={control} name="pricing.currentCustomers" label={t("Current customers")} description={t("Paying customers you have today.")} />
        <AssumptionField
          control={control}
          name="pricing.expectedCustomers12mo"
          label={t("Expected customers after 12 months")}
          description={t("Defaults to the target customers you set on the Market step.")}
          hint={t("Pre-filled from Market → Target customers — edit to override.")}
        />
        <AssumptionField
          control={control}
          name="pricing.expectedMonthlyCustomerGrowthPct"
          label={t("Expected monthly customer growth")}
          suffix="%"
          step={0.5}
          description={t("Compounding month-over-month growth rate applied to new customer acquisition in forecasts.")}
        />
        {showFreeToPaidConversion && (
          <AssumptionField
            control={control}
            name="pricing.freeToPaidConversionPct"
            label={t("Free-to-paid conversion rate")}
            suffix="%"
            step={0.5}
            description={t("Optional — only relevant if you run a freemium funnel.")}
          />
        )}
        <AssumptionField
          control={control}
          name="pricing.topCustomersRevenueSharePct"
          label={t("Revenue share from top customers")}
          suffix="%"
          step={1}
          description={t("Estimated % of monthly revenue coming from your largest 3-5 customers. Leave unset if revenue is spread evenly.")}
        />
      </div>
    </div>
  );
}
