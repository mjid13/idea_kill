"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { projectRepository } from "@/lib/storage/browserRepository";
import { onePagerSchema, type OnePagerFormValues } from "@/lib/validation/businessDocumentsSchema";
import { LinkedTextField } from "@/components/documents/LinkedField";
import type { Project } from "@/types";

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
    defaultValues: {
      problem: project.onePager?.problem ?? "",
      customer: project.onePager?.customer ?? "",
      solution: project.onePager?.solution ?? "",
      differentiation: project.onePager?.differentiation ?? "",
    },
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
            {t("Solution defaults to your project description — edit it here without changing the original.")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1.5">
          <Label>{t("Problem")}</Label>
          <LinkedTextField control={control} name="problem" computed={undefined} placeholder={t("What problem does this solve?")} />
        </div>

        <div className="space-y-1.5">
          <Label>{t("Customer")}</Label>
          <LinkedTextField control={control} name="customer" computed={undefined} placeholder={t("Who has this problem?")} />
        </div>

        <div className="space-y-1.5">
          <Label>{t("Solution")}</Label>
          <LinkedTextField control={control} name="solution" computed={project.basicInfo.description || undefined} placeholder={t("How do you solve it?")} />
        </div>

        <div className="space-y-1.5">
          <Label>{t("Differentiation")}</Label>
          <LinkedTextField control={control} name="differentiation" computed={undefined} placeholder={t("Why you, and not the alternatives?")} />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? t("Saving…") : t("Save one-pager")}
          </Button>
        </div>
      </form>
    </div>
  );
}
