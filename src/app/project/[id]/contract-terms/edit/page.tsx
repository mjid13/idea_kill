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
import { contractTermsSchema, type ContractTermsFormValues } from "@/lib/validation/businessDocumentsSchema";
import { LinkedTextField } from "@/components/documents/LinkedField";
import { suggestPaymentTerms } from "@/lib/documents/derive";
import type { Project } from "@/types";

export default function ContractTermsEditPage() {
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
        {project && <ContractTermsEditForm project={project} />}
      </main>
    </div>
  );
}

function ContractTermsEditForm({ project }: { project: Project }) {
  const router = useRouter();
  const t = useAppTranslations();
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<ContractTermsFormValues>({
    resolver: zodResolver(contractTermsSchema),
    defaultValues: {
      scope: project.contractTerms?.scope ?? "",
      payment: project.contractTerms?.payment ?? "",
      ip: project.contractTerms?.ip ?? "",
      liability: project.contractTerms?.liability ?? "",
      cancellation: project.contractTerms?.cancellation ?? "",
      supportTerms: project.contractTerms?.supportTerms ?? "",
    },
  });

  async function onSubmit(values: ContractTermsFormValues) {
    setSubmitting(true);
    try {
      const updated: Project = { ...project, contractTerms: { ...project.contractTerms, ...values } };
      await projectRepository.save(updated);
      router.push(`/project/${project.id}/contract-terms`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8 space-y-3">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/contract-terms`} />}>
          <ArrowLeft /> {t("Back to contract / terms")}
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("Edit contract / terms")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Scope defaults from MVP Scope and payment defaults from our pricing — both editable here. This is a starting draft, not legal advice.")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1.5">
          <Label>{t("Scope")}</Label>
          <LinkedTextField control={control} name="scope" computed={project.mvpScope?.mustHaveFunctionality || undefined} placeholder={t("What's covered by this agreement?")} />
        </div>

        <div className="space-y-1.5">
          <Label>{t("Payment")}</Label>
          <LinkedTextField control={control} name="payment" computed={suggestPaymentTerms(project)} placeholder={t("Amount, schedule, and method.")} />
        </div>

        <div className="space-y-1.5">
          <Label>{t("IP")}</Label>
          <LinkedTextField control={control} name="ip" computed={undefined} placeholder={t("Who owns what's built or delivered?")} />
        </div>

        <div className="space-y-1.5">
          <Label>{t("Liability")}</Label>
          <LinkedTextField control={control} name="liability" computed={undefined} placeholder={t("Limits on damages and responsibility.")} />
        </div>

        <div className="space-y-1.5">
          <Label>{t("Cancellation")}</Label>
          <LinkedTextField control={control} name="cancellation" computed={undefined} placeholder={t("Notice period and conditions to end the agreement.")} />
        </div>

        <div className="space-y-1.5">
          <Label>{t("Support terms")}</Label>
          <LinkedTextField control={control} name="supportTerms" computed={undefined} placeholder={t("What support is included, and response times.")} />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? t("Saving…") : t("Save contract / terms")}
          </Button>
        </div>
      </form>
    </div>
  );
}
