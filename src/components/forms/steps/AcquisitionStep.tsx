"use client";

import type { Control } from "react-hook-form";
import { AssumptionField } from "@/components/forms/AssumptionField";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function AcquisitionStep({ control }: { control: Control<ProjectFormValues> }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <AssumptionField control={control} name="acquisition.monthlyMarketingSpend" label="Monthly marketing spend" prefix="$" />
      <AssumptionField control={control} name="acquisition.monthlySalesSpend" label="Monthly sales spend" prefix="$" />
      <AssumptionField
        control={control}
        name="acquisition.newCustomersAcquiredMonthly"
        label="New customers acquired / month"
        description="Drives CAC = (marketing + sales spend) / new customers."
        formula="(Marketing + Sales Spend) / New Customers"
      />
      <AssumptionField control={control} name="acquisition.monthlyLeads" label="Monthly leads" description="Optional — used to derive lead-to-customer conversion automatically." />
      <AssumptionField
        control={control}
        name="acquisition.leadToCustomerConversionPct"
        label="Lead-to-customer conversion rate"
        suffix="%"
        step={0.5}
        description="Leave as Unknown to have it calculated automatically from leads and new customers."
      />
    </div>
  );
}
