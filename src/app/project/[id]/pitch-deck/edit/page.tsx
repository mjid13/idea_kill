"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { useForm, useFieldArray, useController, useWatch, Controller, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { projectRepository } from "@/lib/storage/browserRepository";
import { pitchDeckDetailsSchema, type PitchDeckDetailsFormValues } from "@/lib/validation/pitchDeckSchema";
import { FUNDING_ROUND_LABELS, FUNDING_ROUND_OPTIONS } from "@/lib/constants";
import { calculateMetrics } from "@/lib/calculations";
import type { FundingRoundType, Project } from "@/types";

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function PitchDeckEditPage() {
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
        {project && <PitchDeckEditForm project={project} />}
      </main>
    </div>
  );
}

function PitchDeckEditForm({ project }: { project: Project }) {
  const router = useRouter();
  const t = useAppTranslations();
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<PitchDeckDetailsFormValues>({
    resolver: zodResolver(pitchDeckDetailsSchema),
    defaultValues: {
      tractionHistory: project.pitch?.tractionHistory ?? [],
      teamMembers: project.pitch?.teamMembers ?? [],
      competitors: project.pitch?.competitors ?? [],
      round: project.pitch?.round ?? {},
    },
  });

  const traction = useFieldArray({ control, name: "tractionHistory" });
  const team = useFieldArray({ control, name: "teamMembers" });
  const competitors = useFieldArray({ control, name: "competitors" });

  // Same dollars-per-customer the wizard already collected — traction rows
  // shouldn't force the user to redo that multiplication by hand.
  const metrics = useMemo(() => calculateMetrics(project), [project]);
  const monthlyArpu = metrics.revenue.monthlyArpu;

  async function onSubmit(values: PitchDeckDetailsFormValues) {
    setSubmitting(true);
    try {
      const updated: Project = { ...project, pitch: { ...project.pitch, ...values } };
      await projectRepository.save(updated);
      router.push(`/project/${project.id}/pitch-deck`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8 space-y-3">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/pitch-deck`} />}>
          <ArrowLeft /> {t("Back to deck")}
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("Deck details")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Structured content used only by the investor pitch deck — growth over time, named team members, named competitors, and round terms. None of this affects our viability score."
            )}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <FormSection
          title="Traction history"
          description="A few data points showing growth over time — as many or as few as we have."
        >
          {traction.fields.map((field, i) => (
            <Row key={field.id} onRemove={() => traction.remove(i)}>
              <Controller
                control={control}
                name={`tractionHistory.${i}.label`}
                render={({ field }) => <Input placeholder={t("e.g. Jan 2026")} {...field} className="sm:w-32" />}
              />
              <NumberController control={control} name={`tractionHistory.${i}.customers`} placeholder={t("Customers")} />
              <TractionMrrField control={control} index={i} monthlyArpu={monthlyArpu} />
            </Row>
          ))}
          <AddButton onClick={() => traction.append({ id: newId(), label: "", customers: undefined, mrr: undefined })}>
            {t("Add data point")}
          </AddButton>
        </FormSection>

        <FormSection title="Team" description="Founders and key team members.">
          {team.fields.map((field, i) => (
            <Row key={field.id} onRemove={() => team.remove(i)} stacked>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Controller control={control} name={`teamMembers.${i}.name`} render={({ field }) => <Input placeholder={t("Name")} {...field} />} />
                <Controller control={control} name={`teamMembers.${i}.role`} render={({ field }) => <Input placeholder={t("Role")} {...field} />} />
              </div>
              <Controller
                control={control}
                name={`teamMembers.${i}.bio`}
                render={({ field }) => <Textarea rows={2} placeholder={t("Relevant background (optional)")} {...field} />}
              />
            </Row>
          ))}
          <AddButton onClick={() => team.append({ id: newId(), name: "", role: "", bio: "" })}>{t("Add team member")}</AddButton>
        </FormSection>

        <FormSection title="Competitors" description="Who else solves this, and how are we different from each one specifically.">
          {competitors.fields.map((field, i) => (
            <Row key={field.id} onRemove={() => competitors.remove(i)} stacked>
              <Controller
                control={control}
                name={`competitors.${i}.name`}
                render={({ field }) => <Input placeholder={t("Competitor name")} {...field} />}
              />
              <Controller
                control={control}
                name={`competitors.${i}.edge`}
                render={({ field }) => <Textarea rows={2} placeholder={t("Our edge against them")} {...field} />}
              />
            </Row>
          ))}
          <AddButton onClick={() => competitors.append({ id: newId(), name: "", edge: "" })}>{t("Add competitor")}</AddButton>
        </FormSection>

        <FormSection title="Round details" description="Optional terms for the round we're raising, if applicable.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{t("Round type")}</Label>
              <Controller
                control={control}
                name="round.roundType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{(v: FundingRoundType) => t(FUNDING_ROUND_LABELS[v])}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {FUNDING_ROUND_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {t(o.label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Valuation")}</Label>
              <NumberController control={control} name="round.valuation" placeholder={t("e.g. 3000000")} />
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label>{t("Previous investors")}</Label>
              <Controller
                control={control}
                name="round.previousInvestors"
                render={({ field }) => <Input placeholder={t("Optional")} {...field} />}
              />
            </div>
          </div>
        </FormSection>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? t("Saving…") : t("Save deck details")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const t = useAppTranslations();
  return (
    <div className="rounded-xl border border-border bg-card p-5 ring-1 ring-foreground/5">
      <h2 className="text-sm font-semibold text-foreground">{t(title)}</h2>
      <p className="mt-0.5 mb-4 text-xs text-muted-foreground">{t(description)}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ children, onRemove, stacked }: { children: React.ReactNode; onRemove: () => void; stacked?: boolean }) {
  const t = useAppTranslations();
  return (
    <div className={`flex gap-2 rounded-lg border border-border/60 p-3 ${stacked ? "flex-col" : "flex-col sm:flex-row sm:items-center"}`}>
      <div className={`flex-1 ${stacked ? "space-y-2" : "flex flex-col gap-2 sm:flex-row"}`}>{children}</div>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={t("Remove")}>
        <Trash2 />
      </Button>
    </div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      <Plus /> {children}
    </Button>
  );
}

function NumberController({
  control,
  name,
  placeholder,
}: {
  control: ReturnType<typeof useForm<PitchDeckDetailsFormValues>>["control"];
  name:
    | `tractionHistory.${number}.customers`
    | `tractionHistory.${number}.mrr`
    | "round.valuation";
  placeholder: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Input
          type="number"
          inputMode="decimal"
          placeholder={placeholder}
          value={field.value ?? ""}
          onChange={(e) => {
            const next = e.target.valueAsNumber;
            field.onChange(Number.isFinite(next) ? next : undefined);
          }}
          onBlur={field.onBlur}
          className="sm:w-32"
        />
      )}
    />
  );
}

/**
 * MRR input for a traction row. While the row's own mrr value is still
 * blank, it auto-fills from that row's customer count × the product price
 * entered in the main wizard, so the user never has to multiply it out by
 * hand. Editing mrr directly stops the auto-fill; the icon brings it back
 * at any time.
 */
function TractionMrrField({
  control,
  index,
  monthlyArpu,
}: {
  control: Control<PitchDeckDetailsFormValues>;
  index: number;
  monthlyArpu: number;
}) {
  const t = useAppTranslations();
  const mrrField = useController({ control, name: `tractionHistory.${index}.mrr` });
  const customers = useWatch({ control, name: `tractionHistory.${index}.customers` });

  const linkedRef = useRef<boolean | null>(null);
  const lastSetRef = useRef<number | null>(null);
  if (linkedRef.current === null) {
    linkedRef.current = mrrField.field.value === undefined;
  }

  const computed =
    monthlyArpu > 0 && typeof customers === "number" && Number.isFinite(customers)
      ? Math.round(customers * monthlyArpu * 100) / 100
      : undefined;

  const applyComputed = () => {
    if (computed === undefined) return;
    linkedRef.current = true;
    lastSetRef.current = computed;
    mrrField.field.onChange(computed);
  };

  useEffect(() => {
    if (lastSetRef.current !== null && mrrField.field.value !== lastSetRef.current) {
      // The user changed mrr independently — stop auto-filling this row.
      linkedRef.current = false;
    }
    if (!linkedRef.current || computed === undefined) return;
    lastSetRef.current = computed;
    mrrField.field.onChange(computed);
    // Only re-run when the computed value changes; refs/field are stable across the component's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed]);

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        inputMode="decimal"
        placeholder={t("MRR")}
        value={mrrField.field.value ?? ""}
        onChange={(e) => {
          const next = e.target.valueAsNumber;
          mrrField.field.onChange(Number.isFinite(next) ? next : undefined);
        }}
        onBlur={mrrField.field.onBlur}
        className="sm:w-32"
      />
      {computed !== undefined && (
        <Tooltip>
          <TooltipTrigger
            type="button"
            onClick={applyComputed}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>{t("Recalculate from the linked value")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
