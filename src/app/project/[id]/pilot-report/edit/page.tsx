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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { projectRepository } from "@/lib/storage/browserRepository";
import { pilotReportSchema, type PilotReportFormValues } from "@/lib/validation/businessDocumentsSchema";
import { LinkedTextField } from "@/components/documents/LinkedField";
import { calculateMetrics } from "@/lib/calculations";
import { calculateScoreBreakdown } from "@/lib/scoring";
import { generateDecisionSummary } from "@/lib/insights";
import { getUnverifiedAssumptions, suggestWhoContacted, suggestPilotDecision } from "@/lib/documents/derive";
import type { PilotDecision, Project } from "@/types";

const DECISION_LABELS: Record<PilotDecision, string> = {
  continue: "Continue",
  pivot: "Pivot",
  kill: "Kill",
};

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function PilotReportEditPage() {
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
        {project && <PilotReportEditForm project={project} />}
      </main>
    </div>
  );
}

function PilotReportEditForm({ project }: { project: Project }) {
  const router = useRouter();
  const t = useAppTranslations();
  const [submitting, setSubmitting] = useState(false);

  const suggestedDecision = useMemo(() => {
    const metrics = calculateMetrics(project);
    const scores = calculateScoreBreakdown(project, metrics);
    return suggestPilotDecision(generateDecisionSummary(scores).verdict);
  }, [project]);

  const { control, handleSubmit } = useForm<PilotReportFormValues>({
    resolver: zodResolver(pilotReportSchema),
    defaultValues: {
      whoContacted: project.pilotReport?.whoContacted ?? "",
      whatHappened: project.pilotReport?.whatHappened ?? [],
      salesResults: project.pilotReport?.salesResults ?? "",
      customerFeedback: project.pilotReport?.customerFeedback ?? [],
      updatedAssumptions: project.pilotReport?.updatedAssumptions ?? [],
      decision: project.pilotReport?.decision ?? suggestedDecision,
    },
  });

  const log = useFieldArray({ control, name: "whatHappened" });
  const feedback = useFieldArray({ control, name: "customerFeedback" });
  const assumptions = useFieldArray({ control, name: "updatedAssumptions" });
  const unverified = useMemo(() => getUnverifiedAssumptions(project), [project]);

  function addAssumptionsToTrack() {
    const existing = new Set(assumptions.fields.map((f) => f.label));
    for (const a of unverified) {
      if (!existing.has(a.label)) assumptions.append({ id: newId(), label: a.label, status: "open" });
    }
  }

  async function onSubmit(values: PilotReportFormValues) {
    setSubmitting(true);
    try {
      const updated: Project = { ...project, pilotReport: { ...project.pilotReport, ...values } };
      await projectRepository.save(updated);
      router.push(`/project/${project.id}/pilot-report`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8 space-y-3">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/pilot-report`} />}>
          <ArrowLeft /> {t("Back to pilot report")}
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("Edit pilot report")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Who was contacted defaults from your GTM prospect list, and the decision defaults from your current viability score — both editable here.")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-1.5">
          <Label>{t("Who was contacted")}</Label>
          <LinkedTextField control={control} name="whoContacted" computed={suggestWhoContacted(project)} placeholder={t("Names or companies contacted during the pilot.")} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5 ring-1 ring-foreground/5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{t("What happened")}</h2>
          <div className="space-y-3">
            {log.fields.map((field, i) => (
              <div key={field.id} className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-start">
                <Controller
                  control={control}
                  name={`whatHappened.${i}.label`}
                  render={({ field }) => <Input placeholder={t("e.g. Week 1")} {...field} className="sm:w-32" />}
                />
                <Controller
                  control={control}
                  name={`whatHappened.${i}.text`}
                  render={({ field }) => <Textarea rows={2} placeholder={t("What happened this period?")} {...field} className="flex-1" />}
                />
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => log.remove(i)} aria-label={t("Remove")}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => log.append({ id: newId(), label: "", text: "" })}>
              <Plus /> {t("Add entry")}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("Sales results")}</Label>
          <LinkedTextField control={control} name="salesResults" computed={undefined} placeholder={t("What sold, and for how much?")} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5 ring-1 ring-foreground/5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{t("Customer feedback")}</h2>
          <div className="space-y-3">
            {feedback.fields.map((field, i) => (
              <div key={field.id} className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-start">
                <Controller
                  control={control}
                  name={`customerFeedback.${i}.quote`}
                  render={({ field }) => <Textarea rows={2} placeholder={t("What did they say?")} {...field} className="flex-1" />}
                />
                <Controller
                  control={control}
                  name={`customerFeedback.${i}.source`}
                  render={({ field }) => <Input placeholder={t("Who said it")} {...field} className="sm:w-40" />}
                />
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => feedback.remove(i)} aria-label={t("Remove")}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => feedback.append({ id: newId(), quote: "", source: "" })}>
              <Plus /> {t("Add feedback")}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 ring-1 ring-foreground/5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">{t("Updated assumptions")}</h2>
            {unverified.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={addAssumptionsToTrack}>
                <Sparkles /> {t("Suggest from assumptions")}
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {assumptions.fields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2 rounded-lg border border-border/60 p-3">
                <span className="flex-1 text-sm text-foreground">{t(field.label)}</span>
                <Controller
                  control={control}
                  name={`updatedAssumptions.${i}.status`}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">{t("Open")}</SelectItem>
                        <SelectItem value="confirmed">{t("Confirmed")}</SelectItem>
                        <SelectItem value="invalidated">{t("Invalidated")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => assumptions.remove(i)} aria-label={t("Remove")}>
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("Continue / Pivot / Kill decision")}</Label>
          <Controller
            control={control}
            name="decision"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-48">
                  <SelectValue>{(v: PilotDecision) => t(DECISION_LABELS[v])}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="continue">{t("Continue")}</SelectItem>
                  <SelectItem value="pivot">{t("Pivot")}</SelectItem>
                  <SelectItem value="kill">{t("Kill")}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            {t("Suggested value")}: {t(DECISION_LABELS[suggestedDecision])} ({t("from your current viability score")})
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? t("Saving…") : t("Save pilot report")}
          </Button>
        </div>
      </form>
    </div>
  );
}
