"use client";

import { useAppTranslations } from "@/components/i18n/use-app-translations";
import type { Control } from "react-hook-form";
import { RatingField } from "@/components/forms/RatingField";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function RiskStep({ control }: { control: Control<ProjectFormValues> }) {
  const t = useAppTranslations();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <RatingField control={control} name="risk.technicalRisk" label={t("Technical risk")} lowLabel={t("Low risk")} highLabel={t("High risk")} />
      <RatingField control={control} name="risk.marketRisk" label={t("Market risk")} lowLabel={t("Low risk")} highLabel={t("High risk")} />
      <RatingField control={control} name="risk.regulatoryRisk" label={t("Regulatory risk")} lowLabel={t("Low risk")} highLabel={t("High risk")} />
      <RatingField control={control} name="risk.competitiveRisk" label={t("Competitive risk")} lowLabel={t("Low risk")} highLabel={t("High risk")} />
      <RatingField control={control} name="risk.financialRisk" label={t("Financial risk")} lowLabel={t("Low risk")} highLabel={t("High risk")} />
      <RatingField control={control} name="risk.dependencyRisk" label={t("Dependency risk")} lowLabel={t("Low risk")} highLabel={t("High risk")} />
    </div>
  );
}
