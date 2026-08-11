"use client";

import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";
import { AssumptionField } from "@/components/forms/AssumptionField";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function UnitEconomicsStep({ control }: { control: Control<ProjectFormValues> }) {
  const t = useTranslations();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <AssumptionField
        control={control}
        name="unitEconomics.revenuePerCustomer"
        label={t("Revenue per customer")}
        prefix="$"
        description={t("Typically the same as your monthly ARPU.")}
        hint={t("Pre-filled from your product price — edit to override.")}
      />
      <AssumptionField control={control} name="unitEconomics.directCostPerCustomer" label={t("Direct cost per customer")} prefix="$" />
      <AssumptionField control={control} name="unitEconomics.paymentProcessingPct" label={t("Payment processing %")} suffix="%" step={0.1} />
      <AssumptionField control={control} name="unitEconomics.infrastructureCostPerCustomer" label={t("Infrastructure cost per customer")} prefix="$" />
      <AssumptionField control={control} name="unitEconomics.supportCostPerCustomer" label={t("Support cost per customer")} prefix="$" />
      <AssumptionField control={control} name="unitEconomics.otherVariableCostPerCustomer" label={t("Other variable cost per customer")} prefix="$" />
    </div>
  );
}
