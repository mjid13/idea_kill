"use client";

import type { Control } from "react-hook-form";
import { RatingField } from "@/components/forms/RatingField";
import { StepSection } from "@/components/forms/StepSection";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function ValidationStep({ control }: { control: Control<ProjectFormValues> }) {
  return (
    <div className="space-y-6">
      <StepSection title="Problem" description="How real and urgent is the problem?">
        <RatingField control={control} name="validation.problemPain" label="How painful is the problem?" lowLabel="Minor annoyance" highLabel="Severe pain" />
        <RatingField control={control} name="validation.problemFrequency" label="How frequently does it occur?" lowLabel="Rarely" highLabel="Constantly" />
        <RatingField control={control} name="validation.problemAlreadySpendingMoney" label="Is the customer already spending money solving it?" lowLabel="No" highLabel="Significant spend" />
      </StepSection>

      <StepSection title="Validation" description="What evidence do you have?">
        <RatingField control={control} name="validation.customersInterviewed" label="Have customers been interviewed?" lowLabel="None" highLabel="Many" />
        <RatingField control={control} name="validation.hasUsers" label="Do you have users?" lowLabel="None" highLabel="Many" />
        <RatingField control={control} name="validation.hasPayingCustomers" label="Do you have paying customers?" lowLabel="None" highLabel="Many" />
        <RatingField control={control} name="validation.hasSignedLois" label="Do you have signed LOIs/contracts?" lowLabel="None" highLabel="Several" />
        <RatingField control={control} name="validation.customersRequestedSolution" label="Have customers actively requested the solution?" lowLabel="No" highLabel="Frequently" />
      </StepSection>

      <StepSection title="Product" description="Feasibility and differentiation.">
        <RatingField control={control} name="validation.technicallyFeasible" label="Is the product technically feasible?" lowLabel="Very uncertain" highLabel="Well understood" />
        <RatingField control={control} name="validation.mvpDifficulty" label="How difficult is it to build the MVP?" lowLabel="Easy" highLabel="Very difficult" />
        <RatingField control={control} name="validation.productDifferentiation" label="How differentiated is the product?" lowLabel="Commodity" highLabel="Highly unique" />
      </StepSection>

      <StepSection title="Distribution" description="Can you reach customers efficiently?">
        <RatingField control={control} name="validation.knowsHowToReachCustomers" label="Do you know how to reach customers?" lowLabel="No" highLabel="Clear plan" />
        <RatingField control={control} name="validation.hasAudience" label="Do you already have an audience?" lowLabel="None" highLabel="Large" />
        <RatingField control={control} name="validation.hasPartnerships" label="Do you have partnerships or distribution channels?" lowLabel="None" highLabel="Several" />
        <RatingField control={control} name="validation.hasUnfairDistributionAdvantage" label="Do you have an unfair distribution advantage?" lowLabel="None" highLabel="Strong" />
      </StepSection>

      <StepSection title="Competition">
        <RatingField control={control} name="validation.competitionIntensity" label="Competition intensity" lowLabel="Little competition" highLabel="Intense" />
        <RatingField control={control} name="validation.differentiationStrength" label="Strength of differentiation" lowLabel="Weak" highLabel="Strong" />
        <RatingField control={control} name="validation.switchingEase" label="Ease of switching from competitors" lowLabel="Hard to switch" highLabel="Easy to switch" />
      </StepSection>
    </div>
  );
}
