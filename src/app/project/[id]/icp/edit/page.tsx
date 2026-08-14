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
import { icpSchema, type IcpFormValues } from "@/lib/validation/businessDocumentsSchema";
import { LinkedTextField } from "@/components/documents/LinkedField";
import { suggestCurrentAlternatives } from "@/lib/documents/derive";
import type { Project } from "@/types";

export default function IcpEditPage() {
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
        {project && <IcpEditForm project={project} />}
      </main>
    </div>
  );
}

function IcpEditForm({ project }: { project: Project }) {
  const router = useRouter();
  const t = useAppTranslations();
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<IcpFormValues>({
    resolver: zodResolver(icpSchema),
    defaultValues: {
      customerProfile: project.icp?.customerProfile ?? "",
      buyerDecisionMaker: project.icp?.buyerDecisionMaker ?? "",
      painPoints: project.icp?.painPoints ?? "",
      currentAlternatives: project.icp?.currentAlternatives ?? "",
      buyingTriggers: project.icp?.buyingTriggers ?? "",
    },
  });

  async function onSubmit(values: IcpFormValues) {
    setSubmitting(true);
    try {
      const updated: Project = { ...project, icp: { ...project.icp, ...values } };
      await projectRepository.save(updated);
      router.push(`/project/${project.id}/icp`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8 space-y-3">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/icp`} />}>
          <ArrowLeft /> {t("Back to ICP document")}
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("Edit ICP document")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Customer profile defaults to the Customer you entered on the One-Pager — edit it here without changing the original.")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1.5">
          <Label>{t("Exact customer profile")}</Label>
          <LinkedTextField
            control={control}
            name="customerProfile"
            computed={project.onePager?.customer || undefined}
            placeholder={t("Who exactly are you selling to?")}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("Buyer / decision maker")}</Label>
          <LinkedTextField control={control} name="buyerDecisionMaker" computed={undefined} placeholder={t("Who signs off on the purchase?")} />
        </div>

        <div className="space-y-1.5">
          <Label>{t("Pain points")}</Label>
          <LinkedTextField control={control} name="painPoints" computed={undefined} placeholder={t("What's painful about their current situation?")} />
        </div>

        <div className="space-y-1.5">
          <Label>{t("Current alternatives")}</Label>
          <LinkedTextField
            control={control}
            name="currentAlternatives"
            computed={suggestCurrentAlternatives(project)}
            placeholder={t("What do they use today instead?")}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("Buying triggers")}</Label>
          <LinkedTextField control={control} name="buyingTriggers" computed={undefined} placeholder={t("What event makes them start looking?")} />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? t("Saving…") : t("Save ICP document")}
          </Button>
        </div>
      </form>
    </div>
  );
}
