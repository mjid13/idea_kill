import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Label } from "@/components/ui/label";
import { InfoTooltip } from "./InfoTooltip";

interface ComputedFieldProps {
  label: string;
  description?: string;
  formula?: string;
  value: string;
}

/** A read-only value derived live from other fields — never asks the user to re-enter it. */
export function ComputedField({ label, description, formula, value }: ComputedFieldProps) {
  const t = useAppTranslations();
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-xs font-medium text-foreground">
        {label}
        {description && <InfoTooltip description={description} formula={formula} />}
      </Label>
      <div className="flex h-8 items-center justify-between rounded-lg border border-dashed border-border bg-muted/40 px-2.5 text-sm text-foreground">
        <span className="tabular-nums">{value}</span>
        <span className="text-[10px] font-medium text-muted-foreground">{t("Auto-calculated")}</span>
      </div>
    </div>
  );
}
