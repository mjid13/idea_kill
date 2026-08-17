"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Printer, ArrowLeft, Pencil } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { projectRepository } from "@/lib/storage/browserRepository";
import { calculateMetrics } from "@/lib/calculations";
import { calculateScoreBreakdown } from "@/lib/scoring";
import { generateDecisionSummary } from "@/lib/insights";
import { BUSINESS_MODEL_LABELS } from "@/lib/constants";
import { suggestWhoContacted, suggestPilotDecision } from "@/lib/documents/derive";
import { ExportMenu } from "@/components/dashboard/ExportMenu";
import { Slide, Prose } from "@/components/documents/DocumentPrimitives";
import type { PilotDecision, Project } from "@/types";

const DECISION_LABELS: Record<PilotDecision, string> = {
  continue: "Continue",
  pivot: "Pivot",
  kill: "Kill",
};

const DECISION_VARIANTS: Record<PilotDecision, "default" | "secondary" | "destructive"> = {
  continue: "default",
  pivot: "secondary",
  kill: "destructive",
};

export default function PilotReportPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const t = useAppTranslations();

  useEffect(() => {
    projectRepository.getById(params.id).then(setProject);
  }, [params.id]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="no-print">
        <Header />
      </div>
      <main className="flex-1">
        {project === undefined && <div className="p-10 text-center text-sm text-muted-foreground">{t("Loading…")}</div>}
        {project === null && <div className="p-10 text-center text-sm text-muted-foreground">{t("Project not found.")}</div>}
        {project && <PilotReport project={project} />}
      </main>
    </div>
  );
}

function PilotReport({ project }: { project: Project }) {
  const t = useAppTranslations();
  const locale = useLocale();
  const report = project.pilotReport;

  const suggestedDecision = useMemo(() => {
    const metrics = calculateMetrics(project);
    const scores = calculateScoreBreakdown(project, metrics);
    return suggestPilotDecision(generateDecisionSummary(scores).verdict);
  }, [project]);
  const decision = report?.decision ?? suggestedDecision;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0">
      <div className="no-print mb-6 flex items-center justify-between">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/documents`} />}>
          <ArrowLeft /> {t("Back to documents")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/pilot-report/edit`} />}>
            <Pencil /> {t("Edit")}
          </Button>
          <ExportMenu project={project} />
          <Button size="sm" onClick={() => window.print()}>
            <Printer /> {t("Print / Save as PDF")}
          </Button>
        </div>
      </div>

      <header className="mb-8 border-b border-border pb-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("Pilot / Experiment Report")}</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{project.basicInfo.name || t("Untitled project")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(BUSINESS_MODEL_LABELS[project.basicInfo.businessModel])} · {new Date().toLocaleDateString(locale)}
        </p>
      </header>

      <Slide title="Who was contacted">
        <Prose text={report?.whoContacted || suggestWhoContacted(project)} placeholder={t("No contacts entered yet.")} />
      </Slide>

      <Slide title="What happened">
        {report?.whatHappened && report.whatHappened.length > 0 ? (
          <ul className="space-y-2 text-sm text-foreground">
            {report.whatHappened.map((e) => (
              <li key={e.id}>
                <span className="font-medium">{e.label}</span>
                {e.text && <span className="text-muted-foreground"> — {e.text}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("Nothing logged yet.")}</p>
        )}
      </Slide>

      <Slide title="Sales results">
        <Prose text={report?.salesResults} placeholder={t("No sales results entered yet.")} />
      </Slide>

      <Slide title="Customer feedback">
        {report?.customerFeedback && report.customerFeedback.length > 0 ? (
          <ul className="space-y-2 text-sm text-foreground">
            {report.customerFeedback.map((f) => (
              <li key={f.id}>
                “{f.quote}” {f.source && <span className="text-muted-foreground">— {f.source}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("No customer feedback entered yet.")}</p>
        )}
      </Slide>

      <Slide title="Updated assumptions">
        {report?.updatedAssumptions && report.updatedAssumptions.length > 0 ? (
          <ul className="space-y-1 text-sm text-foreground">
            {report.updatedAssumptions.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <Badge variant={a.status === "confirmed" ? "default" : a.status === "invalidated" ? "destructive" : "outline"}>
                  {t(a.status === "confirmed" ? "Confirmed" : a.status === "invalidated" ? "Invalidated" : "Open")}
                </Badge>
                {t(a.label)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("No assumptions tracked yet.")}</p>
        )}
      </Slide>

      <Slide title="Continue / Pivot / Kill decision" last>
        <div className="flex items-center gap-3">
          <Badge variant={DECISION_VARIANTS[decision]}>{t(DECISION_LABELS[decision])}</Badge>
          {!report?.decision && (
            <p className="text-xs text-muted-foreground">{t("Suggested from our current viability score — confirm or override in Edit.")}</p>
          )}
        </div>
      </Slide>
    </div>
  );
}
