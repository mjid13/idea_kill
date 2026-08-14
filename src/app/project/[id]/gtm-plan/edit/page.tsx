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
import { gtmPlanSchema, type GtmPlanFormValues } from "@/lib/validation/businessDocumentsSchema";
import { LinkedTextField, LinkedNumberField } from "@/components/documents/LinkedField";
import { composeMessaging, suggestSalesTargets } from "@/lib/documents/derive";
import type { Project } from "@/types";

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function GtmPlanEditPage() {
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
        {project && <GtmPlanEditForm project={project} />}
      </main>
    </div>
  );
}

function GtmPlanEditForm({ project }: { project: Project }) {
  const router = useRouter();
  const t = useAppTranslations();
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<GtmPlanFormValues>({
    resolver: zodResolver(gtmPlanSchema),
    defaultValues: {
      acquisitionChannels: project.gtmPlan?.acquisitionChannels ?? "",
      salesProcess: project.gtmPlan?.salesProcess ?? "",
      messaging: project.gtmPlan?.messaging ?? "",
      prospectList: project.gtmPlan?.prospectList ?? [],
      salesTargets: project.gtmPlan?.salesTargets,
    },
  });

  const prospects = useFieldArray({ control, name: "prospectList" });

  async function onSubmit(values: GtmPlanFormValues) {
    setSubmitting(true);
    try {
      const updated: Project = { ...project, gtmPlan: { ...project.gtmPlan, ...values } };
      await projectRepository.save(updated);
      router.push(`/project/${project.id}/gtm-plan`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8 space-y-3">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/gtm-plan`} />}>
          <ArrowLeft /> {t("Back to GTM plan")}
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("Edit go-to-market plan")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Messaging drafts itself from your Value Proposition, and sales targets default to your 12-month customer target — both editable here.")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1.5">
          <Label>{t("Acquisition channels")}</Label>
          <LinkedTextField control={control} name="acquisitionChannels" computed={undefined} placeholder={t("Where will you find customers?")} />
        </div>

        <div className="space-y-1.5">
          <Label>{t("Sales process")}</Label>
          <LinkedTextField control={control} name="salesProcess" computed={undefined} placeholder={t("Walk through the steps from lead to close.")} />
        </div>

        <div className="space-y-1.5">
          <Label>{t("Messaging")}</Label>
          <LinkedTextField control={control} name="messaging" computed={composeMessaging(project.valueProp)} placeholder={t("How will you describe this to prospects?")} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5 ring-1 ring-foreground/5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{t("Initial prospect list")}</h2>
          <div className="space-y-3">
            {prospects.fields.map((field, i) => (
              <div key={field.id} className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center">
                <Controller
                  control={control}
                  name={`prospectList.${i}.company`}
                  render={({ field }) => <Input placeholder={t("Company")} {...field} />}
                />
                <Controller
                  control={control}
                  name={`prospectList.${i}.contact`}
                  render={({ field }) => <Input placeholder={t("Contact")} {...field} />}
                />
                <Controller
                  control={control}
                  name={`prospectList.${i}.status`}
                  render={({ field }) => <Input placeholder={t("Status")} {...field} />}
                />
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => prospects.remove(i)} aria-label={t("Remove")}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => prospects.append({ id: newId(), company: "", contact: "", status: "" })}>
              <Plus /> {t("Add prospect")}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("Sales targets")}</Label>
          <LinkedNumberField control={control} name="salesTargets" computed={suggestSalesTargets(project)} placeholder={t("Target customers")} />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? t("Saving…") : t("Save go-to-market plan")}
          </Button>
        </div>
      </form>
    </div>
  );
}
