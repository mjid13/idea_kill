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
import { valuePropSchema, type ValuePropFormValues } from "@/lib/validation/businessDocumentsSchema";
import { LinkedTextField } from "@/components/documents/LinkedField";
import type { Project } from "@/types";

export default function ValuePropEditPage() {
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
        {project && <ValuePropEditForm project={project} />}
      </main>
    </div>
  );
}

function ValuePropEditForm({ project }: { project: Project }) {
  const router = useRouter();
  const t = useAppTranslations();
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<ValuePropFormValues>({
    resolver: zodResolver(valuePropSchema),
    defaultValues: {
      whatYouSell: project.valueProp?.whatYouSell ?? "",
      customerOutcome: project.valueProp?.customerOutcome ?? "",
      scope: project.valueProp?.scope ?? "",
      whyBuyNow: project.valueProp?.whyBuyNow ?? "",
    },
  });

  async function onSubmit(values: ValuePropFormValues) {
    setSubmitting(true);
    try {
      const updated: Project = { ...project, valueProp: { ...project.valueProp, ...values } };
      await projectRepository.save(updated);
      router.push(`/project/${project.id}/value-prop`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8 space-y-3">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/value-prop`} />}>
          <ArrowLeft /> {t("Back to value proposition")}
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("Edit value proposition")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("What you sell defaults to your project description — edit it here without changing the original. Pricing is read from Pricing & customers.")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1.5">
          <Label>{t("What you sell")}</Label>
          <LinkedTextField
            control={control}
            name="whatYouSell"
            computed={project.basicInfo.description || undefined}
            placeholder={t("Describe the offer in one or two sentences.")}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("Customer outcome")}</Label>
          <LinkedTextField control={control} name="customerOutcome" computed={undefined} placeholder={t("What result does the customer get?")} />
        </div>

        <div className="space-y-1.5">
          <Label>{t("Scope")}</Label>
          <LinkedTextField control={control} name="scope" computed={undefined} placeholder={t("What's included, and what isn't?")} />
        </div>

        <div className="space-y-1.5">
          <Label>{t("Why buy now")}</Label>
          <LinkedTextField control={control} name="whyBuyNow" computed={undefined} placeholder={t("Why act today instead of later?")} />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? t("Saving…") : t("Save value proposition")}
          </Button>
        </div>
      </form>
    </div>
  );
}
