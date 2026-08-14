"use client";

import { RotateCcw } from "lucide-react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLinkedField } from "@/lib/forms/useLinkedField";

function RevertButton({ onClick }: { onClick: () => void }) {
  const t = useAppTranslations();
  return (
    <Tooltip>
      <TooltipTrigger type="button" onClick={onClick} className="shrink-0 text-muted-foreground hover:text-foreground">
        <RotateCcw className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>{t("Refill from linked data")}</TooltipContent>
    </Tooltip>
  );
}

export function LinkedTextField<TFieldValues extends FieldValues, TName extends Path<TFieldValues>>({
  control,
  name,
  computed,
  placeholder,
  rows = 3,
}: {
  control: Control<TFieldValues>;
  name: TName;
  computed: string | undefined;
  placeholder?: string;
  rows?: number;
}) {
  const { field, applyComputed, hasComputed } = useLinkedField({ control, name, computed });
  return (
    <div className="flex items-start gap-1.5">
      <Textarea
        rows={rows}
        placeholder={placeholder}
        value={(field.value as string | undefined) ?? ""}
        onChange={(e) => field.onChange(e.target.value)}
        onBlur={field.onBlur}
        className="flex-1"
      />
      {hasComputed && <RevertButton onClick={applyComputed} />}
    </div>
  );
}

export function LinkedNumberField<TFieldValues extends FieldValues, TName extends Path<TFieldValues>>({
  control,
  name,
  computed,
  placeholder,
}: {
  control: Control<TFieldValues>;
  name: TName;
  computed: number | undefined;
  placeholder?: string;
}) {
  const { field, applyComputed, hasComputed } = useLinkedField({ control, name, computed });
  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        inputMode="decimal"
        placeholder={placeholder}
        value={(field.value as number | undefined) ?? ""}
        onChange={(e) => {
          const next = e.target.valueAsNumber;
          field.onChange(Number.isFinite(next) ? next : undefined);
        }}
        onBlur={field.onBlur}
        className="sm:w-40"
      />
      {hasComputed && <RevertButton onClick={applyComputed} />}
    </div>
  );
}
