"use client";

import Link from "next/link";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Download, FileOutput, FileText, Sheet, Presentation, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { buildExportBundle, downloadProjectCsv, downloadProjectJson } from "@/lib/export/exportData";
import { calculateMetrics, generateScenarios } from "@/lib/calculations";
import { calculateScoreBreakdown } from "@/lib/scoring";
import { generateInsights } from "@/lib/insights";
import type { Project } from "@/types";

export function ExportMenu({ project }: { project: Project }) {
  const t = useAppTranslations();
  function handleDownload(kind: "json" | "csv") {
    const metrics = calculateMetrics(project);
    const scores = calculateScoreBreakdown(project, metrics);
    const insights = generateInsights(metrics, scores, project);
    const scenarios = generateScenarios(project, metrics);
    const bundle = buildExportBundle(project, metrics, scores, insights, scenarios);
    if (kind === "json") downloadProjectJson(bundle);
    else downloadProjectCsv(bundle);
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <FileOutput /> {t("Export")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Export this project")}</DialogTitle>
          <DialogDescription>{t("Everything is generated locally in your browser — nothing is uploaded anywhere.")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <ExportRow
            icon={FileText}
            title={t("Viability report")}
            description={t("Printable summary of scores, metrics, and recommendations.")}
            render={<Link href={`/project/${project.id}/report`} target="_blank" />}
          />
          <ExportRow
            icon={Presentation}
            title={t("Investor pitch deck")}
            description={t("Narrative deck: problem, market, traction, economics, the ask.")}
            render={<Link href={`/project/${project.id}/pitch-deck`} target="_blank" />}
          />
          <ExportRow
            icon={LayoutGrid}
            title={t("Business documents")}
            description={t("One-pager, ICP, validation plan, GTM, financial model, and more — built from this project.")}
            render={<Link href={`/project/${project.id}/documents`} />}
          />
          <ExportRow
            icon={Download}
            title={t("All data — JSON")}
            description={t("Every input and calculated output, for backup or re-use elsewhere.")}
            onClick={() => handleDownload("json")}
          />
          <ExportRow
            icon={Sheet}
            title={t("All data — CSV")}
            description={t("Same data, flattened for spreadsheets.")}
            onClick={() => handleDownload("csv")}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExportRow({
  icon: Icon,
  title,
  description,
  onClick,
  render,
}: {
  icon: typeof Download;
  title: string;
  description: string;
  onClick?: () => void;
  render?: React.ReactElement;
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      render={render}
      className="h-auto w-full items-start justify-start gap-3 p-3 text-left font-normal whitespace-normal"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs font-normal text-muted-foreground">{description}</p>
      </div>
    </Button>
  );
}
