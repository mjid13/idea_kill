"use client";

import type { Control } from "react-hook-form";
import { AssumptionField } from "@/components/forms/AssumptionField";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function OpexStep({ control }: { control: Control<ProjectFormValues> }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <AssumptionField control={control} name="costs.founderSalaries" label="Founder salaries" prefix="$" />
      <AssumptionField control={control} name="costs.employeeSalaries" label="Employee salaries" prefix="$" />
      <AssumptionField control={control} name="costs.contractorExpenses" label="Contractor expenses" prefix="$" />
      <AssumptionField control={control} name="costs.officeExpenses" label="Office expenses" prefix="$" />
      <AssumptionField control={control} name="costs.infrastructure" label="Infrastructure" prefix="$" />
      <AssumptionField control={control} name="costs.softwareSubscriptions" label="Software subscriptions" prefix="$" />
      <AssumptionField control={control} name="costs.marketing" label="Marketing" prefix="$" />
      <AssumptionField control={control} name="costs.sales" label="Sales expenses" prefix="$" />
      <AssumptionField control={control} name="costs.legalAccounting" label="Legal / accounting" prefix="$" />
      <AssumptionField control={control} name="costs.otherMonthlyExpenses" label="Other monthly expenses" prefix="$" />
    </div>
  );
}
