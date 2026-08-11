"use client";

import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";
import { RatingField } from "@/components/forms/RatingField";
import { StepSection } from "@/components/forms/StepSection";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function ValidationStep({ control }: { control: Control<ProjectFormValues> }) {
  const t = useTranslations();
  return (
    <div className="space-y-6">
      <StepSection title={t("Problem")} description={t("How real and urgent is the problem?")}>
        <RatingField control={control} name="validation.problemPain" label={t("How painful is the problem?")} lowLabel={t("Minor annoyance")} highLabel={t("Severe pain")} />
        <RatingField control={control} name="validation.problemFrequency" label={t("How frequently does it occur?")} lowLabel={t("Rarely")} highLabel={t("Constantly")} />
        <RatingField control={control} name="validation.problemAlreadySpendingMoney" label={t("Is the customer already spending money solving it?")} lowLabel={t("No")} highLabel={t("Significant spend")} />
      </StepSection>

      <StepSection title={t("Validation")} description={t("What evidence do you have?")}>
        <RatingField control={control} name="validation.customersInterviewed" label={t("Have customers been interviewed?")} lowLabel={t("None")} highLabel={t("Many")} />
        <RatingField control={control} name="validation.hasUsers" label={t("Do you have users?")} lowLabel={t("None")} highLabel={t("Many")} />
        <RatingField control={control} name="validation.hasPayingCustomers" label={t("Do you have paying customers?")} lowLabel={t("None")} highLabel={t("Many")} />
        <RatingField control={control} name="validation.hasSignedLois" label={t("Do you have signed LOIs/contracts?")} lowLabel={t("None")} highLabel={t("Several")} />
        <RatingField control={control} name="validation.customersRequestedSolution" label={t("Have customers actively requested the solution?")} lowLabel={t("No")} highLabel={t("Frequently")} />
      </StepSection>

      <StepSection title={t("Product")} description={t("Feasibility and differentiation.")}>
        <RatingField control={control} name="validation.technicallyFeasible" label={t("Is the product technically feasible?")} lowLabel={t("Very uncertain")} highLabel={t("Well understood")} />
        <RatingField control={control} name="validation.mvpDifficulty" label={t("How difficult is it to build the MVP?")} lowLabel={t("Easy")} highLabel={t("Very difficult")} />
        <RatingField control={control} name="validation.productDifferentiation" label={t("How differentiated is the product?")} lowLabel={t("Commodity")} highLabel={t("Highly unique")} />
      </StepSection>

      <StepSection title={t("Distribution")} description={t("Can you reach customers efficiently?")}>
        <RatingField control={control} name="validation.knowsHowToReachCustomers" label={t("Do you know how to reach customers?")} lowLabel={t("No")} highLabel={t("Clear plan")} />
        <RatingField control={control} name="validation.hasAudience" label={t("Do you already have an audience?")} lowLabel={t("None")} highLabel={t("Large")} />
        <RatingField control={control} name="validation.hasPartnerships" label={t("Do you have partnerships or distribution channels?")} lowLabel={t("None")} highLabel={t("Several")} />
        <RatingField control={control} name="validation.hasUnfairDistributionAdvantage" label={t("Do you have an unfair distribution advantage?")} lowLabel={t("None")} highLabel={t("Strong")} />
      </StepSection>

      <StepSection title={t("Competition")}>
        <RatingField control={control} name="validation.competitionIntensity" label={t("Competition intensity")} lowLabel={t("Little competition")} highLabel={t("Intense")} />
        <RatingField control={control} name="validation.differentiationStrength" label={t("Strength of differentiation")} lowLabel={t("Weak")} highLabel={t("Strong")} />
        <RatingField control={control} name="validation.switchingEase" label={t("Ease of switching from competitors")} lowLabel={t("Hard to switch")} highLabel={t("Easy to switch")} />
      </StepSection>
    </div>
  );
}
