"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { projectRepository } from "@/lib/storage/browserRepository";
import { onePagerSchema, type OnePagerFormValues } from "@/lib/validation/businessDocumentsSchema";
import { ONE_PAGER_SECTIONS } from "@/lib/documents/onePagerSections";
import { LinkedTextField } from "@/components/documents/LinkedField";
import type { Project } from "@/types";

const NARRATIVE_FIELDS = ONE_PAGER_SECTIONS.filter((s) => s.render.kind === "narrative").map((s) => ({
  ...(s.render as Extract<(typeof ONE_PAGER_SECTIONS)[number]["render"], { kind: "narrative" }>),
}));

export default function OnePagerEditPage() {
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
        {project && <OnePagerEditForm project={project} />}
      </main>
    </div>
  );
}

function OnePagerEditForm({ project }: { project: Project }) {
  const router = useRouter();
  const t = useAppTranslations();
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<OnePagerFormValues>({
    resolver: zodResolver(onePagerSchema),
    defaultValues: Object.fromEntries(
      NARRATIVE_FIELDS.map((f) => [f.field.key, (project.onePager?.[f.field.key as keyof typeof project.onePager] as string) ?? ""])
    ) as OnePagerFormValues,
  });

  async function onSubmit(values: OnePagerFormValues) {
    setSubmitting(true);
    try {
      const updated: Project = { ...project, onePager: { ...project.onePager, ...values } };
      await projectRepository.save(updated);
      router.push(`/project/${project.id}/one-pager`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8 space-y-3">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/one-pager`} />}>
          <ArrowLeft /> {t("Back to one-pager")}
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("Edit one-pager")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Solution and the ask default from other data in the project — edit either here, and use the revert icon to pull the default back.")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {NARRATIVE_FIELDS.map((f) => (
          <div className="space-y-1.5" key={f.field.key}>
            <Label>{t(f.field.label)}</Label>
            <LinkedTextField
              control={control}
              name={f.field.key as Path<OnePagerFormValues>}
              computed={f.computedDefault?.(project)}
              placeholder={t(f.field.placeholder)}
            />
          </div>
        ))}

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? t("Saving…") : t("Save one-pager")}
          </Button>
        </div>
      </form>
    </div>
  );
}
