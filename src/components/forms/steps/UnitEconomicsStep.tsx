"use client";

import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { useWatch, type Control } from "react-hook-form";
import { AssumptionField } from "@/components/forms/AssumptionField";
import { ComputedField } from "@/components/forms/ComputedField";
import { BUSINESS_MODEL_LABELS } from "@/lib/constants";
import { getBenchmarks } from "@/lib/scoring/benchmarks";
import { formatPercentage } from "@/lib/format";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function UnitEconomicsStep({ control }: { control: Control<ProjectFormValues> }) {
  const t = useAppTranslations();
  const businessModel = useWatch({ control, name: "basicInfo.businessModel" });
  const revenuePerCustomer = useWatch({ control, name: "unitEconomics.revenuePerCustomer.value" }) ?? 0;
  const directCost = useWatch({ control, name: "unitEconomics.directCostPerCustomer.value" }) ?? 0;
  const paymentProcessingPct = useWatch({ control, name: "unitEconomics.paymentProcessingPct.value" }) ?? 0;
  const infrastructure = useWatch({ control, name: "unitEconomics.infrastructureCostPerCustomer.value" }) ?? 0;
  const support = useWatch({ control, name: "unitEconomics.supportCostPerCustomer.value" }) ?? 0;
  const other = useWatch({ control, name: "unitEconomics.otherVariableCostPerCustomer.value" }) ?? 0;

  const paymentProcessingCost = revenuePerCustomer * (paymentProcessingPct / 100);
  const variableCost = directCost + paymentProcessingCost + infrastructure + support + other;
  const grossMarginPct = revenuePerCustomer > 0 ? ((revenuePerCustomer - variableCost) / revenuePerCustomer) * 100 : null;
  const typicalGrossMargin = getBenchmarks(businessModel).typicalGrossMarginPct;

  const currentCustomers = useWatch({ control, name: "pricing.currentCustomers.value" }) ?? 0;
  const aov = useWatch({ control, name: "marketplace.averageOrderValue.value" }) ?? 0;
  const takeRatePct = useWatch({ control, name: "marketplace.takeRatePct.value" }) ?? 0;
  const transactionsPerCustomer = useWatch({ control, name: "marketplace.transactionsPerCustomerPerMonth.value" }) ?? 0;
  const marketplaceEffectiveArpu =
    businessModel === "marketplace" && currentCustomers > 0
      ? (currentCustomers * transactionsPerCustomer * aov * (takeRatePct / 100)) / currentCustomers
      : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <AssumptionField
        control={control}
        name="unitEconomics.revenuePerCustomer"
        label={t("Revenue per customer")}
        prefix="$"
        description={t("Typically the same as your monthly ARPU.")}
        hint={
          marketplaceEffectiveArpu !== null
            ? t("Marketplace take-rate ARPU: {value} — consider using this instead of a flat subscription-style price.", {
                value: marketplaceEffectiveArpu.toFixed(2),
              })
            : t("Pre-filled from your product price — edit to override.")
        }
      />
      <AssumptionField control={control} name="unitEconomics.directCostPerCustomer" label={t("Direct cost per customer")} prefix="$" />
      <AssumptionField control={control} name="unitEconomics.paymentProcessingPct" label={t("Payment processing %")} suffix="%" step={0.1} />
      <AssumptionField control={control} name="unitEconomics.infrastructureCostPerCustomer" label={t("Infrastructure cost per customer")} prefix="$" />
      <AssumptionField control={control} name="unitEconomics.supportCostPerCustomer" label={t("Support cost per customer")} prefix="$" />
      <AssumptionField control={control} name="unitEconomics.otherVariableCostPerCustomer" label={t("Other variable cost per customer")} prefix="$" />
      <ComputedField
        label={t("Gross margin")}
        description={t("Typical for {model}: {range}", {
          model: t(BUSINESS_MODEL_LABELS[businessModel]),
          range: typicalGrossMargin,
        })}
        formula={t("(Revenue Per Customer − Variable Costs) / Revenue Per Customer")}
        value={grossMarginPct === null ? t("Enter revenue per customer above") : formatPercentage(grossMarginPct)}
      />
    </div>
  );
}
