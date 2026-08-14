"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Sparkles, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { projectRepository } from "@/lib/storage/browserRepository";
import { validationPlanSchema, type ValidationPlanFormValues } from "@/lib/validation/businessDocumentsSchema";
import { LinkedNumberField } from "@/components/documents/LinkedField";
import { getUnverifiedAssumptions, suggestInterviewQuestions } from "@/lib/documents/derive";
import { translateReason } from "@/components/i18n/translate-insight";
import type { Project } from "@/types";

const DEFAULT_TARGET_INTERVIEWS = 15;

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ValidationPlanEditPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const t = useAppTranslations();

  useEffect(() => {
    projectRepository.getById(params.id).then(setProject);
  }, [params.id]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {project === undefined && <div className="p-10 text-center text-sm text-muted-foreground">{t("Loading…")}</div>}
        {project === null && <div className="p-10 text-center text-sm text-muted-foreground">{t("Project not found.")}</div>}
        {project && <ValidationPlanEditForm project={project} />}
      </main>
    </div>
  );
}

function ValidationPlanEditForm({ project }: { project: Project }) {
  const router = useRouter();
  const t = useAppTranslations();
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<ValidationPlanFormValues>({
    resolver: zodResolver(validationPlanSchema),
    defaultValues: {
      interviewQuestions: project.validationPlan?.interviewQuestions ?? [],
      targetInterviews: project.validationPlan?.targetInterviews,
      successFailureCriteria: project.validationPlan?.successFailureCriteria ?? "",
    },
  });

  const questions = useFieldArray({ control, name: "interviewQuestions" });
  const unverified = useMemo(() => getUnverifiedAssumptions(project), [project]);
  const suggestions = useMemo(() => suggestInterviewQuestions(unverified), [unverified]);

  function addSuggestions() {
    const existing = new Set(questions.fields.map((f) => f.text));
    for (const s of suggestions) {
      const text = translateReason(t, s);
      if (!existing.has(text)) questions.append({ id: newId(), text });
    }
  }

  async function onSubmit(values: ValidationPlanFormValues) {
    setSubmitting(true);
    try {
      const updated: Project = { ...project, validationPlan: { ...project.validationPlan, ...values } };
      await projectRepository.save(updated);
      router.push(`/project/${project.id}/validation-plan`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8 space-y-3">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/validation-plan`} />}>
          <ArrowLeft /> {t("Back to validation plan")}
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("Edit validation plan")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Assumptions to test are shown on the plan automatically — they're every assumption flagged estimated or unknown elsewhere in this project.")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="rounded-xl border border-border bg-card p-5 ring-1 ring-foreground/5">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t("Interview questions")}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("One question per row, asked in customer interviews.")}</p>
            </div>
            {suggestions.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={addSuggestions}>
                <Sparkles /> {t("Suggest from assumptions")}
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {questions.fields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2 rounded-lg border border-border/60 p-3">
                <Controller
                  control={control}
                  name={`interviewQuestions.${i}.text`}
                  render={({ field }) => <Textarea rows={2} placeholder={t("What will you ask?")} {...field} className="flex-1" />}
                />
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => questions.remove(i)} aria-label={t("Remove")}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => questions.append({ id: newId(), text: "" })}>
              <Plus /> {t("Add question")}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("Target number of interviews")}</Label>
          <LinkedNumberField control={control} name="targetInterviews" computed={DEFAULT_TARGET_INTERVIEWS} placeholder={t("e.g. 15")} />
        </div>

        <div className="space-y-1.5">
          <Label>{t("Success / failure criteria")}</Label>
          <Controller
            control={control}
            name="successFailureCriteria"
            render={({ field }) => (
              <Textarea rows={3} placeholder={t("What result confirms the idea, and what result kills it?")} {...field} />
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? t("Saving…") : t("Save validation plan")}
          </Button>
        </div>
      </form>
    </div>
  );
}
