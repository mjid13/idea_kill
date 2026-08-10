"use client";

import { useController, type Control, type FieldPath } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoTooltip } from "./InfoTooltip";
import { QualityToggle } from "./QualityToggle";
import { cn } from "@/lib/utils";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";
import type { DataQuality } from "@/types";

interface AssumptionFieldProps {
  control: Control<ProjectFormValues>;
  name: FieldPath<ProjectFormValues>;
  label: string;
  description?: string;
  formula?: string;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  placeholder?: string;
}

/** Numeric assumption input paired with a Known/Estimated/Unknown data-quality toggle. */
export function AssumptionField({
  control,
  name,
  label,
  description,
  formula,
  prefix,
  suffix,
  step = 1,
  min = 0,
  placeholder,
}: AssumptionFieldProps) {
  const valueField = useController({ control, name: `${name}.value` as FieldPath<ProjectFormValues> });
  const qualityField = useController({ control, name: `${name}.quality` as FieldPath<ProjectFormValues> });

  const rawValue = valueField.field.value;
  const displayValue = typeof rawValue === "number" && Number.isFinite(rawValue) ? rawValue : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <Label className="flex items-center gap-1 text-xs font-medium text-foreground">
          {label}
          {description && <InfoTooltip description={description} formula={formula} />}
        </Label>
        <QualityToggle
          value={qualityField.field.value as DataQuality}
          onChange={(v) => qualityField.field.onChange(v)}
        />
      </div>
      <div className="relative flex items-center">
        {prefix && <span className="pointer-events-none absolute left-2.5 text-xs text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          step={step}
          min={min}
          inputMode="decimal"
          placeholder={placeholder}
          className={cn(prefix && "pl-7", suffix && "pr-8")}
          value={Number.isFinite(displayValue) ? displayValue : 0}
          onChange={(e) => {
            const next = e.target.valueAsNumber;
            valueField.field.onChange(Number.isFinite(next) ? next : 0);
          }}
          onBlur={valueField.field.onBlur}
        />
        {suffix && <span className="pointer-events-none absolute right-2.5 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
