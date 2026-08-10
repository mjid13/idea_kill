"use client";

import type { Control } from "react-hook-form";
import { AssumptionField } from "@/components/forms/AssumptionField";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function FundingStep({ control }: { control: Control<ProjectFormValues> }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <AssumptionField control={control} name="funding.availableCash" label="Available cash" prefix="$" />
      <AssumptionField control={control} name="funding.initialInvestment" label="Initial investment" prefix="$" />
      <AssumptionField control={control} name="funding.otherMonthlyIncome" label="Other monthly income" prefix="$" description="Grants, interest, or other non-operating income that offsets burn." />
    </div>
  );
}
