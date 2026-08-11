"use client";

import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";
import { AssumptionField } from "@/components/forms/AssumptionField";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function FundingStep({ control }: { control: Control<ProjectFormValues> }) {
  const t = useTranslations();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <AssumptionField control={control} name="funding.availableCash" label={t("Available cash")} prefix="$" />
      <AssumptionField control={control} name="funding.initialInvestment" label={t("Initial investment")} prefix="$" />
      <AssumptionField control={control} name="funding.otherMonthlyIncome" label={t("Other monthly income")} prefix="$" description={t("Grants, interest, or other non-operating income that offsets burn.")} />
    </div>
  );
}
