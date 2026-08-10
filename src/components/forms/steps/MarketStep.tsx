"use client";

import { useState } from "react";
import { Controller, type Control } from "react-hook-form";
import { AssumptionField } from "@/components/forms/AssumptionField";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function MarketStep({ control }: { control: Control<ProjectFormValues> }) {
  const [directEntry, setDirectEntry] = useState(false);

  return (
    <div className="space-y-6">
      {!directEntry && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AssumptionField
            control={control}
            name="market.totalPotentialCustomers"
            label="Total potential customers"
            description="The full universe of customers who could conceivably use this product."
            step={100}
          />
          <AssumptionField
            control={control}
            name="market.averageAnnualCustomerSpend"
            label="Average annual customer spend"
            description="What a typical customer spends per year in this category."
            prefix="$"
          />
          <AssumptionField
            control={control}
            name="market.addressableMarketPct"
            label="Addressable market %"
            description="Percentage of the total market realistically addressable given your positioning and geography."
            suffix="%"
            step={1}
          />
          <AssumptionField
            control={control}
            name="market.obtainableMarketPct"
            label="Obtainable market %"
            description="Percentage of the addressable market you could realistically capture."
            suffix="%"
            step={1}
          />
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <Label className="text-xs font-medium">Enter TAM/SAM/SOM directly</Label>
          <p className="text-[11px] text-muted-foreground">Skip the bottom-up build if you already know your market sizing.</p>
        </div>
        <Switch checked={directEntry} onCheckedChange={setDirectEntry} />
      </div>

      {directEntry && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">TAM override</Label>
            <Controller
              control={control}
              name="market.tamOverride"
              render={({ field }) => (
                <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">SAM override</Label>
            <Controller
              control={control}
              name="market.samOverride"
              render={({ field }) => <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.valueAsNumber)} />}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">SOM override</Label>
            <Controller
              control={control}
              name="market.somOverride"
              render={({ field }) => <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.valueAsNumber)} />}
            />
          </div>
        </div>
      )}

      <AssumptionField
        control={control}
        name="market.targetCustomers"
        label="Target customers (planning horizon)"
        description="Customers you're targeting within your planning horizon — used to compute required market penetration."
        step={10}
      />
    </div>
  );
}
