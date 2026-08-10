"use client";

import type { Control } from "react-hook-form";
import { AssumptionField } from "@/components/forms/AssumptionField";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function RetentionStep({ control }: { control: Control<ProjectFormValues> }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <AssumptionField
        control={control}
        name="retention.monthlyChurnPct"
        label="Monthly churn rate"
        suffix="%"
        step={0.5}
        formula="Customer Lifetime (months) = 1 / Monthly Churn Rate"
        description="Percentage of customers who cancel each month."
      />
      <AssumptionField control={control} name="retention.annualChurnPct" label="Annual churn rate" suffix="%" description="Optional — used to approximate monthly churn if monthly is unknown." />
      <AssumptionField
        control={control}
        name="retention.averageCustomerLifetimeMonths"
        label="Average customer lifetime"
        suffix="months"
        description="Optional override — leave Unknown to derive it from churn."
      />
    </div>
  );
}
