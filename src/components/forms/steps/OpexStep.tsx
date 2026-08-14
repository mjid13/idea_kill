"use client";

import { useAppTranslations } from "@/components/i18n/use-app-translations";
import type { Control } from "react-hook-form";
import { AssumptionField } from "@/components/forms/AssumptionField";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function OpexStep({ control }: { control: Control<ProjectFormValues> }) {
  const t = useAppTranslations();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <AssumptionField control={control} name="costs.founderSalaries" label={t("Founder salaries")} prefix="$" />
      <AssumptionField control={control} name="costs.employeeSalaries" label={t("Employee salaries")} prefix="$" />
      <AssumptionField control={control} name="costs.contractorExpenses" label={t("Contractor expenses")} prefix="$" />
      <AssumptionField control={control} name="costs.officeExpenses" label={t("Office expenses")} prefix="$" />
      <AssumptionField control={control} name="costs.infrastructure" label={t("Infrastructure")} prefix="$" />
      <AssumptionField control={control} name="costs.softwareSubscriptions" label={t("Software subscriptions")} prefix="$" />
      <AssumptionField
        control={control}
        name="costs.marketing"
        label={t("Marketing")}
        prefix="$"
        description={t("Same spend as the marketing budget entered in Customer Acquisition.")}
        hint={t("Synced from Customer Acquisition — edit to use a different number.")}
      />
      <AssumptionField
        control={control}
        name="costs.sales"
        label={t("Sales expenses")}
        prefix="$"
        description={t("Same spend as the sales budget entered in Customer Acquisition.")}
        hint={t("Synced from Customer Acquisition — edit to use a different number.")}
      />
      <AssumptionField control={control} name="costs.legalAccounting" label={t("Legal / accounting")} prefix="$" />
      <AssumptionField control={control} name="costs.otherMonthlyExpenses" label={t("Other monthly expenses")} prefix="$" />
    </div>
  );
}
