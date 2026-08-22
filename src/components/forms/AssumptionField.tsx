"use client";

import { RotateCcw, Sigma } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { useController, type Control, type FieldPath } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoTooltip } from "./InfoTooltip";
import { QualityToggle } from "./QualityToggle";
import { useFieldLink } from "./FieldLinker";
import { cn } from "@/lib/utils";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";
import type { AssumptionRange, DataQuality } from "@/types";

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
  /** Small caption under the input, e.g. to note it was pre-filled from another step. */
  hint?: string;
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
  hint,
}: AssumptionFieldProps) {
  const t = useAppTranslations();
  const valueField = useController({ control, name: `${name}.value` as FieldPath<ProjectFormValues> });
  const qualityField = useController({ control, name: `${name}.quality` as FieldPath<ProjectFormValues> });
  const rangeField = useController({ control, name: `${name}.range` as FieldPath<ProjectFormValues> });
  const recalculate = useFieldLink(name);

  // Per-step validation silently refuses to advance the wizard when any field
  // in the step is invalid, so every assumption must surface its own error.
  // Messages can land on `${name}.value` (including the object-level refines,
  // which are re-pathed there) or under `${name}.range`.
  const rangeError = rangeField.fieldState.error as
    | { message?: string; low?: { message?: string }; high?: { message?: string } }
    | undefined;
  const errorMessage =
    valueField.fieldState.error?.message ??
    rangeError?.low?.message ??
    rangeError?.high?.message ??
    rangeError?.message;

  // An optional assumption that the saved project never carried arrives here as
  // `undefined`. Merely mounting these controllers materializes the parent
  // object with undefined members, which the schema then rejects on `value` and
  // `quality` — an invalid field the user never touched. Seed the same pristine
  // default the factory uses so the field is valid from the first render.
  useEffect(() => {
    if (typeof valueField.field.value !== "number") valueField.field.onChange(0);
    if (qualityField.field.value === undefined) qualityField.field.onChange("unknown");
    // Mount-only: later edits are the user's own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rawValue = valueField.field.value;
  const displayValue = typeof rawValue === "number" && Number.isFinite(rawValue) ? rawValue : 0;
  const range = (rangeField.field.value ?? undefined) as AssumptionRange | undefined;
  const isRanged = !!range;

  // Typing any number implies the user knows it; promote out of the pristine
  // "Unknown" default so it counts toward confidence and can flow into linked
  // fields. The user can still downgrade it afterward via the toggle.
  const promoteQuality = useCallback(() => {
    if (qualityField.field.value === "unknown") qualityField.field.onChange("known");
  }, [qualityField.field]);

  /** Keeps low <= most likely <= high by nudging whichever bounds the edit crossed. */
  const commitTriple = useCallback(
    (edited: "low" | "likely" | "high", next: number) => {
      const current = { low: range?.low ?? displayValue, likely: displayValue, high: range?.high ?? displayValue };
      const triple = { ...current, [edited]: next };

      if (edited === "likely") {
        triple.low = Math.min(triple.low, next);
        triple.high = Math.max(triple.high, next);
      } else if (edited === "low") {
        triple.likely = Math.max(triple.likely, next);
        triple.high = Math.max(triple.high, triple.likely);
      } else {
        triple.likely = Math.min(triple.likely, next);
        triple.low = Math.min(triple.low, triple.likely);
      }

      valueField.field.onChange(triple.likely);
      rangeField.field.onChange({ low: triple.low, high: triple.high });
      promoteQuality();
    },
    [displayValue, promoteQuality, range?.high, range?.low, rangeField.field, valueField.field]
  );

  const toggleRange = useCallback(() => {
    if (isRanged) {
      // React Hook Form treats `undefined` as "fall back to the default value".
      // That makes a range loaded with an existing project immediately reappear
      // after it is cleared. `null` is an explicit form-only sentinel; the Zod
      // schema normalizes it back to an absent range before submission.
      rangeField.field.onChange(null);
      return;
    }
    // Seed a +/-25% band around the current point estimate as a starting guess.
    const spread = Math.abs(displayValue) * 0.25;
    rangeField.field.onChange({ low: Math.max(min, displayValue - spread), high: displayValue + spread });
    // A range is by definition not a known number.
    if (qualityField.field.value === "known") qualityField.field.onChange("estimated");
  }, [displayValue, isRanged, min, qualityField.field, rangeField.field]);

  const numberInput = (
    fieldValue: number,
    onChange: (next: number) => void,
    onBlur: () => void,
    extra?: { placeholder?: string; ariaLabel?: string; invalid?: boolean }
  ) => (
    <div className="relative flex items-center">
      {prefix && <span className="pointer-events-none absolute left-2.5 text-xs text-muted-foreground">{prefix}</span>}
      <Input
        type="number"
        step={step}
        min={min}
        inputMode="decimal"
        aria-label={extra?.ariaLabel}
        aria-invalid={extra?.invalid ?? !!errorMessage}
        placeholder={extra?.placeholder ?? placeholder}
        className={cn(prefix && "pl-7", suffix && "pr-8")}
        value={Number.isFinite(fieldValue) ? fieldValue : 0}
        onChange={(e) => {
          const next = e.target.valueAsNumber;
          onChange(Number.isFinite(next) ? next : 0);
        }}
        onBlur={onBlur}
      />
      {suffix && <span className="pointer-events-none absolute right-2.5 text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <Label className="flex items-center gap-1 text-xs font-medium text-foreground">
          {label}
          {description && <InfoTooltip description={description} formula={formula} />}
          {recalculate && (
            <Tooltip>
              <TooltipTrigger
                type="button"
                onClick={recalculate}
                className="inline-flex align-middle text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>{t("Recalculate from the linked value")}</TooltipContent>
            </Tooltip>
          )}
        </Label>
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger
              type="button"
              onClick={toggleRange}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium",
                isRanged ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sigma className="size-3" />
              {isRanged ? t("Range") : t("Single")}
            </TooltipTrigger>
            <TooltipContent>
              {isRanged
                ? t("Switch back to a single number")
                : t("Enter a low/high range instead of one number — ranged inputs are what the simulation samples")}
            </TooltipContent>
          </Tooltip>
          <QualityToggle value={qualityField.field.value as DataQuality} onChange={(v) => qualityField.field.onChange(v)} />
        </div>
      </div>

      {isRanged ? (
        <div className="grid grid-cols-3 gap-1.5">
          <div className="space-y-1">
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{t("Low")}</span>
            {numberInput(range.low, (next) => commitTriple("low", next), rangeField.field.onBlur, { ariaLabel: `${label} — ${t("Low")}` })}
          </div>
          <div className="space-y-1">
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{t("Most likely")}</span>
            {numberInput(displayValue, (next) => commitTriple("likely", next), valueField.field.onBlur, {
              ariaLabel: `${label} — ${t("Most likely")}`,
            })}
          </div>
          <div className="space-y-1">
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{t("High")}</span>
            {numberInput(range.high, (next) => commitTriple("high", next), rangeField.field.onBlur, { ariaLabel: `${label} — ${t("High")}` })}
          </div>
        </div>
      ) : (
        numberInput(
          displayValue,
          (next) => {
            valueField.field.onChange(next);
            promoteQuality();
          },
          valueField.field.onBlur
        )
      )}
      {errorMessage && <p className="text-xs text-destructive">{t(errorMessage)}</p>}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
