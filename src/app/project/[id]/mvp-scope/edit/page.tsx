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
import { Label } from "@/components/ui/label";
import { projectRepository } from "@/lib/storage/browserRepository";
import { mvpScopeSchema, type MvpScopeFormValues } from "@/lib/validation/businessDocumentsSchema";
import { LinkedTextField } from "@/components/documents/LinkedField";
import type { Project } from "@/types";

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function MvpScopeEditPage() {
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
        {project && <MvpScopeEditForm project={project} />}
      </main>
    </div>
  );
}

function MvpScopeEditForm({ project }: { project: Project }) {
  const router = useRouter();
  const t = useAppTranslations();
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<MvpScopeFormValues>({
    resolver: zodResolver(mvpScopeSchema),
    defaultValues: {
      mustHaveFunctionality: project.mvpScope?.mustHaveFunctionality ?? "",
      explicitlyExcluded: project.mvpScope?.explicitlyExcluded ?? "",
      userFlow: project.mvpScope?.userFlow ?? "",
      acceptanceCriteria: project.mvpScope?.acceptanceCriteria ?? [],
    },
  });

  const criteria = useFieldArray({ control, name: "acceptanceCriteria" });

  async function onSubmit(values: MvpScopeFormValues) {
    setSubmitting(true);
    try {
      const updated: Project = { ...project, mvpScope: { ...project.mvpScope, ...values } };
      await projectRepository.save(updated);
      router.push(`/project/${project.id}/mvp-scope`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8 space-y-3">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/mvp-scope`} />}>
          <ArrowLeft /> {t("Back to MVP scope")}
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("Edit MVP scope")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Must-have functionality defaults to the Scope we entered on the Value Proposition — edit it here without changing the original.")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1.5">
          <Label>{t("Must-have functionality")}</Label>
          <LinkedTextField
            control={control}
            name="mustHaveFunctionality"
            computed={project.valueProp?.scope || undefined}
            placeholder={t("What must the first version do?")}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("What is explicitly excluded")}</Label>
          <LinkedTextField control={control} name="explicitlyExcluded" computed={undefined} placeholder={t("What are we deliberately leaving out?")} />
        </div>

        <div className="space-y-1.5">
          <Label>{t("User flow")}</Label>
          <LinkedTextField control={control} name="userFlow" computed={undefined} placeholder={t("Walk through the steps a user takes.")} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5 ring-1 ring-foreground/5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{t("Acceptance criteria")}</h2>
          <div className="space-y-3">
            {criteria.fields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2 rounded-lg border border-border/60 p-3">
                <Controller
                  control={control}
                  name={`acceptanceCriteria.${i}.text`}
                  render={({ field }) => <Input placeholder={t("A condition that must be true to call this done.")} {...field} className="flex-1" />}
                />
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => criteria.remove(i)} aria-label={t("Remove")}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => criteria.append({ id: newId(), text: "" })}>
              <Plus /> {t("Add criterion")}
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? t("Saving…") : t("Save MVP scope")}
          </Button>
        </div>
      </form>
    </div>
  );
}
