"use client";

import { Controller, type Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUSINESS_MODEL_LABELS, BUSINESS_MODEL_OPTIONS, CURRENCY_LABELS, CURRENCY_OPTIONS } from "@/lib/constants";
import type { BusinessModel, Currency } from "@/types";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function BasicInfoStep({ control }: { control: Control<ProjectFormValues> }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="basicInfo.name">Project name</Label>
        <Controller
          control={control}
          name="basicInfo.name"
          render={({ field, fieldState }) => (
            <>
              <Input id="basicInfo.name" placeholder="e.g. Acme Invoicing" aria-invalid={!!fieldState.error} {...field} />
              {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
            </>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="basicInfo.description">Short description</Label>
        <Controller
          control={control}
          name="basicInfo.description"
          render={({ field }) => (
            <Textarea id="basicInfo.description" rows={3} placeholder="What does it do, and for whom?" {...field} />
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Business model</Label>
          <Controller
            control={control}
            name="basicInfo.businessModel"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: BusinessModel) => BUSINESS_MODEL_LABELS[v]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_MODEL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Currency</Label>
          <Controller
            control={control}
            name="basicInfo.currency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: Currency) => CURRENCY_LABELS[v]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((o) => (
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
    </div>
  );
}
