"use client";

import { useAppTranslations } from "@/components/i18n/use-app-translations";
import type { Control } from "react-hook-form";
import { RatingField } from "@/components/forms/RatingField";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function TeamStep({ control }: { control: Control<ProjectFormValues> }) {
  const t = useAppTranslations();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <RatingField control={control} name="team.domainExpertise" label={t("Domain expertise")} lowLabel={t("None")} highLabel={t("Deep expert")} />
      <RatingField control={control} name="team.technicalAbility" label={t("Technical ability")} lowLabel={t("Weak")} highLabel={t("Strong")} />
      <RatingField control={control} name="team.salesCapability" label={t("Sales capability")} lowLabel={t("Weak")} highLabel={t("Strong")} />
      <RatingField control={control} name="team.marketingCapability" label={t("Marketing capability")} lowLabel={t("Weak")} highLabel={t("Strong")} />
      <RatingField control={control} name="team.founderCommitment" label={t("Founder commitment")} lowLabel={t("Part-time")} highLabel={t("All-in")} />
      <RatingField control={control} name="team.industryRelationships" label={t("Access to industry relationships")} lowLabel={t("None")} highLabel={t("Extensive")} />
      <RatingField control={control} name="team.accessToCapital" label={t("Ability to raise or provide capital")} lowLabel={t("Limited")} highLabel={t("Strong")} />
    </div>
  );
}
