"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { projectRepository } from "@/lib/storage/localStorageRepository";
import { pitchDeckDetailsSchema, type PitchDeckDetailsFormValues } from "@/lib/validation/pitchDeckSchema";
import { FUNDING_ROUND_LABELS, FUNDING_ROUND_OPTIONS } from "@/lib/constants";
import type { FundingRoundType, Project } from "@/types";

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function PitchDeckEditPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null | undefined>(undefined);

  useEffect(() => {
    projectRepository.getById(params.id).then(setProject);
  }, [params.id]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {project === undefined && <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>}
        {project === null && <div className="p-10 text-center text-sm text-muted-foreground">Project not found.</div>}
        {project && <PitchDeckEditForm project={project} />}
      </main>
    </div>
  );
}

function PitchDeckEditForm({ project }: { project: Project }) {
  const router = useRouter();
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
          <ArrowLeft /> Back to deck
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Deck details</h1>
          <p className="text-sm text-muted-foreground">
            Structured content used only by the investor pitch deck — growth over time, named team members, named
            competitors, and round terms. None of this affects your viability score.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <FormSection title="Traction history" description="A few data points showing growth over time — as many or as few as you have.">
          {traction.fields.map((field, i) => (
            <Row key={field.id} onRemove={() => traction.remove(i)}>
              <Controller
                control={control}
                name={`tractionHistory.${i}.label`}
                render={({ field }) => <Input placeholder="e.g. Jan 2026" {...field} className="sm:w-32" />}
              />
              <NumberController control={control} name={`tractionHistory.${i}.customers`} placeholder="Customers" />
              <NumberController control={control} name={`tractionHistory.${i}.mrr`} placeholder="MRR" />
            </Row>
          ))}
          <AddButton onClick={() => traction.append({ id: newId(), label: "", customers: undefined, mrr: undefined })}>
            Add data point
          </AddButton>
        </FormSection>

        <FormSection title="Team" description="Founders and key team members.">
          {team.fields.map((field, i) => (
            <Row key={field.id} onRemove={() => team.remove(i)} stacked>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Controller control={control} name={`teamMembers.${i}.name`} render={({ field }) => <Input placeholder="Name" {...field} />} />
                <Controller control={control} name={`teamMembers.${i}.role`} render={({ field }) => <Input placeholder="Role" {...field} />} />
              </div>
              <Controller
                control={control}
                name={`teamMembers.${i}.bio`}
                render={({ field }) => <Textarea rows={2} placeholder="Relevant background (optional)" {...field} />}
              />
            </Row>
          ))}
          <AddButton onClick={() => team.append({ id: newId(), name: "", role: "", bio: "" })}>Add team member</AddButton>
        </FormSection>

        <FormSection title="Competitors" description="Who else solves this, and how are you different from each one specifically.">
          {competitors.fields.map((field, i) => (
            <Row key={field.id} onRemove={() => competitors.remove(i)} stacked>
              <Controller
                control={control}
                name={`competitors.${i}.name`}
                render={({ field }) => <Input placeholder="Competitor name" {...field} />}
              />
              <Controller
                control={control}
                name={`competitors.${i}.edge`}
                render={({ field }) => <Textarea rows={2} placeholder="Your edge against them" {...field} />}
              />
            </Row>
          ))}
          <AddButton onClick={() => competitors.append({ id: newId(), name: "", edge: "" })}>Add competitor</AddButton>
        </FormSection>

        <FormSection title="Round details" description="Optional terms for the round you're raising, if applicable.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Round type</Label>
              <Controller
                control={control}
                name="round.roundType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{(v: FundingRoundType) => FUNDING_ROUND_LABELS[v]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {FUNDING_ROUND_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valuation</Label>
              <NumberController control={control} name="round.valuation" placeholder="e.g. 3000000" />
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label>Previous investors</Label>
              <Controller
                control={control}
                name="round.previousInvestors"
                render={({ field }) => <Input placeholder="Optional" {...field} />}
              />
            </div>
          </div>
        </FormSection>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save deck details"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 ring-1 ring-foreground/5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-0.5 mb-4 text-xs text-muted-foreground">{description}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ children, onRemove, stacked }: { children: React.ReactNode; onRemove: () => void; stacked?: boolean }) {
  return (
    <div className={`flex gap-2 rounded-lg border border-border/60 p-3 ${stacked ? "flex-col" : "flex-col sm:flex-row sm:items-center"}`}>
      <div className={`flex-1 ${stacked ? "space-y-2" : "flex flex-col gap-2 sm:flex-row"}`}>{children}</div>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remove">
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
