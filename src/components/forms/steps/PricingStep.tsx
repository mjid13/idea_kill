"use client";

import { Controller, type Control } from "react-hook-form";
import { AssumptionField } from "@/components/forms/AssumptionField";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BILLING_PERIOD_LABELS, BILLING_PERIOD_OPTIONS } from "@/lib/constants";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";
import type { BillingPeriod } from "@/types";

export function PricingStep({ control }: { control: Control<ProjectFormValues> }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AssumptionField control={control} name="pricing.productPrice" label="Product price" prefix="$" description="The price charged per billing period." />
        <div className="space-y-1.5">
          <Label className="text-xs">Billing period</Label>
          <Controller
            control={control}
            name="pricing.billingPeriod"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: BillingPeriod) => BILLING_PERIOD_LABELS[v]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {BILLING_PERIOD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AssumptionField control={control} name="pricing.currentCustomers" label="Current customers" description="Paying customers you have today." />
        <AssumptionField
          control={control}
          name="pricing.expectedCustomers12mo"
          label="Expected customers after 12 months"
          description="Defaults to the target customers you set on the Market step."
          hint="Pre-filled from Market → Target customers — edit to override."
        />
        <AssumptionField
          control={control}
          name="pricing.expectedMonthlyCustomerGrowthPct"
          label="Expected monthly customer growth"
          suffix="%"
          step={0.5}
          description="Compounding month-over-month growth rate applied to new customer acquisition in forecasts."
        />
        <AssumptionField
          control={control}
          name="pricing.freeToPaidConversionPct"
          label="Free-to-paid conversion rate"
          suffix="%"
          step={0.5}
          description="Optional — only relevant if you run a freemium funnel."
        />
      </div>
    </div>
  );
}
