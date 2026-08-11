"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { projectFormSchema, type ProjectFormValues } from "@/lib/validation/projectSchema";
import { projectRepository } from "@/lib/storage/localStorageRepository";
import { createEmptyProject } from "@/lib/storage/factory";
import { exampleProject } from "@/lib/example";
import { projectToFormValues, formValuesToProject } from "./formMapping";
import { FieldLinker } from "./FieldLinker";
import type { Project } from "@/types";

import { BasicInfoStep } from "./steps/BasicInfoStep";
import { MarketStep } from "./steps/MarketStep";
import { PricingStep } from "./steps/PricingStep";
import { AcquisitionStep } from "./steps/AcquisitionStep";
import { RetentionStep } from "./steps/RetentionStep";
import { UnitEconomicsStep } from "./steps/UnitEconomicsStep";
import { OpexStep } from "./steps/OpexStep";
import { FundingStep } from "./steps/FundingStep";
import { ValidationStep } from "./steps/ValidationStep";
import { TeamStep } from "./steps/TeamStep";
import { RiskStep } from "./steps/RiskStep";
import { PitchStep } from "./steps/PitchStep";

interface StepDef {
  key: keyof ProjectFormValues;
  title: string;
  description: string;
  Component: (props: { control: ReturnType<typeof useForm<ProjectFormValues>>["control"] }) => React.ReactElement;
}

const STEPS: StepDef[] = [
  { key: "basicInfo", title: "Basic information", description: "What are you building?", Component: BasicInfoStep },
  { key: "market", title: "Market", description: "Size the opportunity: TAM, SAM, SOM.", Component: MarketStep },
  { key: "pricing", title: "Pricing & customers", description: "How you charge and how many customers you have.", Component: PricingStep },
  { key: "acquisition", title: "Customer acquisition", description: "What it costs to acquire a customer.", Component: AcquisitionStep },
  { key: "retention", title: "Retention", description: "How long customers stick around.", Component: RetentionStep },
  { key: "unitEconomics", title: "Unit economics", description: "Revenue and cost per customer.", Component: UnitEconomicsStep },
  { key: "costs", title: "Operating expenses", description: "Fixed monthly costs.", Component: OpexStep },
  { key: "funding", title: "Funding & runway", description: "Cash on hand and other income.", Component: FundingStep },
  { key: "validation", title: "Validation", description: "Evidence the problem and solution are real.", Component: ValidationStep },
  { key: "team", title: "Team", description: "Rate your team's capability to execute.", Component: TeamStep },
  { key: "risk", title: "Risk", description: "Rate the risks facing this opportunity.", Component: RiskStep },
  { key: "pitch", title: "Pitch narrative", description: "Optional context used to generate the investor pitch deck.", Component: PitchStep },
];

interface ProjectWizardProps {
  initialProject?: Project;
}

export function ProjectWizard({ initialProject }: ProjectWizardProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const defaultValues = useMemo(
    () => projectToFormValues(initialProject ?? createEmptyProject()),
    [initialProject]
  );

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues,
    mode: "onBlur",
  });
  const { control, handleSubmit, trigger, reset, formState } = form;

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const progressPct = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  async function goNext() {
    const valid = await trigger(step.key);
    if (!valid) return;
    if (isLast) return;
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function loadExample() {
    reset(projectToFormValues(exampleProject));
    setStepIndex(0);
  }

  async function onSubmit(values: ProjectFormValues) {
    setSubmitting(true);
    try {
      const project = formValuesToProject(values, initialProject ? { id: initialProject.id, createdAt: initialProject.createdAt } : undefined);
      await projectRepository.save(project);
      router.push(`/project/${project.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  const StepComponent = step.Component;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
          {!initialProject && (
            <button
              type="button"
              onClick={loadExample}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Sparkles className="size-3" /> Load example
            </button>
          )}
        </div>
        <Progress value={progressPct} />
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{step.title}</h1>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldLinker form={form} />
        <div className="rounded-xl border border-border bg-card p-5 ring-1 ring-foreground/5">
          <StepComponent control={control} />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button type="button" variant="outline" onClick={goBack} disabled={isFirst}>
            <ArrowLeft /> Back
          </Button>

          {isLast ? (
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Calculate viability"} <Check />
            </Button>
          ) : (
            <Button type="button" onClick={goNext}>
              Next <ArrowRight />
            </Button>
          )}
        </div>
        {formState.errors && Object.keys(formState.errors).length > 0 && isLast && (
          <p className="mt-3 text-xs text-destructive">Some fields need attention before you can finish. Please review earlier steps.</p>
        )}
      </form>
    </div>
  );
}
