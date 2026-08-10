"use client";

import type { Control } from "react-hook-form";
import { RatingField } from "@/components/forms/RatingField";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function RiskStep({ control }: { control: Control<ProjectFormValues> }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <RatingField control={control} name="risk.technicalRisk" label="Technical risk" lowLabel="Low risk" highLabel="High risk" />
      <RatingField control={control} name="risk.marketRisk" label="Market risk" lowLabel="Low risk" highLabel="High risk" />
      <RatingField control={control} name="risk.regulatoryRisk" label="Regulatory risk" lowLabel="Low risk" highLabel="High risk" />
      <RatingField control={control} name="risk.competitiveRisk" label="Competitive risk" lowLabel="Low risk" highLabel="High risk" />
      <RatingField control={control} name="risk.financialRisk" label="Financial risk" lowLabel="Low risk" highLabel="High risk" />
      <RatingField control={control} name="risk.dependencyRisk" label="Dependency risk" lowLabel="Low risk" highLabel="High risk" />
    </div>
  );
}
