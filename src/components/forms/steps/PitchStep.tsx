"use client";

import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Controller, type Control } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AssumptionField } from "@/components/forms/AssumptionField";
import { InfoTooltip } from "@/components/forms/InfoTooltip";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

interface NarrativeFieldProps {
  control: Control<ProjectFormValues>;
  name: "pitch.problemStatement" | "pitch.competitiveLandscape" | "pitch.traction" | "pitch.teamBios" | "pitch.vision" | "pitch.useOfFunds";
  label: string;
  placeholder: string;
  description?: string;
  rows?: number;
}

function NarrativeField({ control, name, label, placeholder, description, rows = 3 }: NarrativeFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="flex items-center gap-1 text-xs font-medium text-foreground">
        {label}
        {description && <InfoTooltip description={description} />}
      </Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => <Textarea id={name} rows={rows} placeholder={placeholder} {...field} />}
      />
    </div>
  );
}

/**
 * Purely narrative content used to generate the investor pitch deck export.
 * Every field is optional and feeds no calculation or score — leaving this
 * step blank never affects viability, it only leaves deck sections empty.
 */
export function PitchStep({ control }: { control: Control<ProjectFormValues> }) {
  const t = useAppTranslations();
  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        {t("Optional — used only to fill in the narrative sections of the investor pitch deck export. None of this affects our viability score.")}
      </p>

      <NarrativeField
        control={control}
        name="pitch.problemStatement"
        label={t("Problem")}
        placeholder={t("What problem are we solving, and for whom? Why does it matter?")}
      />

      <NarrativeField
        control={control}
        name="pitch.competitiveLandscape"
        label={t("Competitive landscape")}
        placeholder={t("Who else solves this today, and how are we meaningfully different?")}
      />

      <NarrativeField
        control={control}
        name="pitch.traction"
        label={t("Traction & milestones")}
        placeholder={t("Key proof points so far: customers, revenue, partnerships, launches, press.")}
      />

      <NarrativeField
        control={control}
        name="pitch.teamBios"
        label={t("Team")}
        placeholder={t("Founders and key team members — name, role, and relevant background.")}
      />

      <NarrativeField control={control} name="pitch.vision" label={t("Vision")} placeholder={t("Where does this go in 3-5 years?")} rows={2} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AssumptionField
          control={control}
          name="pitch.fundingAsk"
          label={t("Funding ask")}
          prefix="$"
          description={t("The amount we're raising in this round, if applicable.")}
        />
        <div className="sm:col-span-1">
          <NarrativeField
            control={control}
            name="pitch.useOfFunds"
            label={t("Use of funds")}
            placeholder={t("How will this money be spent? e.g. 60% engineering, 25% sales, 15% buffer.")}
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}
