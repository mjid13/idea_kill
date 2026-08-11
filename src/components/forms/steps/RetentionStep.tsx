"use client";

import { useWatch, type Control } from "react-hook-form";
import { AssumptionField } from "@/components/forms/AssumptionField";
import { ComputedField } from "@/components/forms/ComputedField";
import { formatMonths, formatPercentage } from "@/lib/format";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function RetentionStep({ control }: { control: Control<ProjectFormValues> }) {
  const monthlyChurn = useWatch({ control, name: "retention.monthlyChurnPct.value" }) ?? 0;
  const monthlyChurnQuality = useWatch({ control, name: "retention.monthlyChurnPct.quality" });

  const hasChurn = monthlyChurnQuality !== "unknown" && monthlyChurn > 0;
  const annualChurn = hasChurn ? (1 - Math.pow(1 - monthlyChurn / 100, 12)) * 100 : null;
  const lifetimeMonths = hasChurn ? 100 / monthlyChurn : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <AssumptionField
        control={control}
        name="retention.monthlyChurnPct"
        label="Monthly churn rate"
        suffix="%"
        step={0.5}
        formula="Customer Lifetime (months) = 1 / Monthly Churn Rate"
        description="Percentage of customers who cancel each month. Annual churn and customer lifetime below are calculated from this automatically."
      />
      <ComputedField
        label="Annual churn rate"
        description="Derived from monthly churn — compounded over 12 months."
        formula="1 − (1 − Monthly Churn)^12"
        value={annualChurn === null ? "Enter monthly churn above" : formatPercentage(annualChurn)}
      />
      <ComputedField
        label="Average customer lifetime"
        description="Derived from monthly churn."
        formula="1 / Monthly Churn Rate"
        value={lifetimeMonths === null ? "Enter monthly churn above" : formatMonths(lifetimeMonths)}
      />
    </div>
  );
}
