"use client";

import { useController, type Control, type FieldPath } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { InfoTooltip } from "./InfoTooltip";
import { cn } from "@/lib/utils";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

interface RatingFieldProps {
  control: Control<ProjectFormValues>;
  name: FieldPath<ProjectFormValues>;
  label: string;
  description?: string;
  lowLabel?: string;
  highLabel?: string;
}

/** 1-5 qualitative rating input used across validation, team, and risk assessments. */
export function RatingField({ control, name, label, description, lowLabel = "Low", highLabel = "High" }: RatingFieldProps) {
  const { field } = useController({ control, name });
  const current = typeof field.value === "number" ? field.value : 3;

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-xs font-medium text-foreground">
        {label}
        {description && <InfoTooltip description={description} />}
      </Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => field.onChange(n)}
            aria-pressed={current === n}
            className={cn(
              "h-8 flex-1 rounded-md border text-sm font-medium transition-colors",
              current === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-transparent text-foreground hover:bg-muted"
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
