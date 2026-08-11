"use client";

import type { Control } from "react-hook-form";
import { AssumptionField } from "@/components/forms/AssumptionField";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function UnitEconomicsStep({ control }: { control: Control<ProjectFormValues> }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <AssumptionField
        control={control}
        name="unitEconomics.revenuePerCustomer"
        label="Revenue per customer"
        prefix="$"
        description="Typically the same as your monthly ARPU."
        hint="Pre-filled from your product price — edit to override."
      />
      <AssumptionField control={control} name="unitEconomics.directCostPerCustomer" label="Direct cost per customer" prefix="$" />
      <AssumptionField control={control} name="unitEconomics.paymentProcessingPct" label="Payment processing %" suffix="%" step={0.1} />
      <AssumptionField control={control} name="unitEconomics.infrastructureCostPerCustomer" label="Infrastructure cost per customer" prefix="$" />
      <AssumptionField control={control} name="unitEconomics.supportCostPerCustomer" label="Support cost per customer" prefix="$" />
      <AssumptionField control={control} name="unitEconomics.otherVariableCostPerCustomer" label="Other variable cost per customer" prefix="$" />
    </div>
  );
}
