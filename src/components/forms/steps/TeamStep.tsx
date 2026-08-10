"use client";

import type { Control } from "react-hook-form";
import { RatingField } from "@/components/forms/RatingField";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function TeamStep({ control }: { control: Control<ProjectFormValues> }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <RatingField control={control} name="team.domainExpertise" label="Domain expertise" lowLabel="None" highLabel="Deep expert" />
      <RatingField control={control} name="team.technicalAbility" label="Technical ability" lowLabel="Weak" highLabel="Strong" />
      <RatingField control={control} name="team.salesCapability" label="Sales capability" lowLabel="Weak" highLabel="Strong" />
      <RatingField control={control} name="team.marketingCapability" label="Marketing capability" lowLabel="Weak" highLabel="Strong" />
      <RatingField control={control} name="team.founderCommitment" label="Founder commitment" lowLabel="Part-time" highLabel="All-in" />
      <RatingField control={control} name="team.industryRelationships" label="Access to industry relationships" lowLabel="None" highLabel="Extensive" />
      <RatingField control={control} name="team.accessToCapital" label="Ability to raise or provide capital" lowLabel="Limited" highLabel="Strong" />
    </div>
  );
}
