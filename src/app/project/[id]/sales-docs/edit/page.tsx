"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { projectRepository } from "@/lib/storage/browserRepository";
import { salesDocsSchema, type SalesDocsFormValues } from "@/lib/validation/businessDocumentsSchema";
import { LinkedTextField } from "@/components/documents/LinkedField";
import { suggestProposalTemplate } from "@/lib/documents/derive";
import type { Project } from "@/types";

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function SalesDocsEditPage() {
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
        {project && <SalesDocsEditForm project={project} />}
      </main>
    </div>
  );
}

function SalesDocsEditForm({ project }: { project: Project }) {
  const router = useRouter();
  const t = useAppTranslations();
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<SalesDocsFormValues>({
    resolver: zodResolver(salesDocsSchema),
    defaultValues: {
      demoScript: project.salesDocs?.demoScript ?? [],
      proposalTemplate: project.salesDocs?.proposalTemplate ?? "",
      faq: project.salesDocs?.faq ?? [],
    },
  });

  const script = useFieldArray({ control, name: "demoScript" });
  const faq = useFieldArray({ control, name: "faq" });

  async function onSubmit(values: SalesDocsFormValues) {
    setSubmitting(true);
    try {
      const updated: Project = { ...project, salesDocs: { ...project.salesDocs, ...values } };
      await projectRepository.save(updated);
      router.push(`/project/${project.id}/sales-docs`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8 space-y-3">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/sales-docs`} />}>
          <ArrowLeft /> {t("Back to sales documents")}
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("Edit sales documents")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("The sales one-pager/deck reuses our Business One-Pager and Pitch Deck directly — there's nothing to edit here for it.")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="rounded-xl border border-border bg-card p-5 ring-1 ring-foreground/5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{t("Demo script")}</h2>
          <div className="space-y-3">
            {script.fields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2 rounded-lg border border-border/60 p-3">
                <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">{i + 1}.</span>
                <Controller
                  control={control}
                  name={`demoScript.${i}.text`}
                  render={({ field }) => <Input placeholder={t("What do we show/say at this step?")} {...field} className="flex-1" />}
                />
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => script.remove(i)} aria-label={t("Remove")}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => script.append({ id: newId(), text: "" })}>
              <Plus /> {t("Add step")}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("Proposal / quotation template")}</Label>
          <LinkedTextField control={control} name="proposalTemplate" computed={suggestProposalTemplate(project)} rows={6} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5 ring-1 ring-foreground/5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{t("FAQ / objection handling")}</h2>
          <div className="space-y-3">
            {faq.fields.map((field, i) => (
              <div key={field.id} className="space-y-2 rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name={`faq.${i}.question`}
                    render={({ field }) => <Input placeholder={t("Objection or question")} {...field} className="flex-1" />}
                  />
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => faq.remove(i)} aria-label={t("Remove")}>
                    <Trash2 />
                  </Button>
                </div>
                <Controller
                  control={control}
                  name={`faq.${i}.answer`}
                  render={({ field }) => <Textarea rows={2} placeholder={t("Our response")} {...field} />}
                />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => faq.append({ id: newId(), question: "", answer: "" })}>
              <Plus /> {t("Add FAQ entry")}
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? t("Saving…") : t("Save sales documents")}
          </Button>
        </div>
      </form>
    </div>
  );
}
