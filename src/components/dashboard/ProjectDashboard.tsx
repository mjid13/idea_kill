"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Pencil, FileOutput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calculateMetrics, generateScenarios } from "@/lib/calculations";
import { calculateScoreBreakdown } from "@/lib/scoring";
import { generateInsights, generateDecisionSummary } from "@/lib/insights";
import { BUSINESS_MODEL_LABELS } from "@/lib/constants";
import { ScoreHero } from "./ScoreHero";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { KeyMetricsGrid } from "./KeyMetricsGrid";
import { InsightsPanel, RecommendedActions } from "./InsightsPanel";
import { DecisionSummary } from "./DecisionSummary";
import { SensitivityPanel } from "./SensitivityPanel";
import { ScenarioTable } from "./ScenarioTable";
import { ForecastCharts } from "./ForecastCharts";
import type { Project } from "@/types";

export function ProjectDashboard({ project }: { project: Project }) {
  const metrics = useMemo(() => calculateMetrics(project), [project]);
  const scores = useMemo(() => calculateScoreBreakdown(project, metrics), [project, metrics]);
  const insights = useMemo(() => generateInsights(metrics, scores, project), [metrics, scores, project]);
  const decision = useMemo(() => generateDecisionSummary(scores), [scores]);
  const scenarios = useMemo(() => generateScenarios(project, metrics), [project, metrics]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{project.basicInfo.name || "Untitled project"}</h1>
            <Badge variant="secondary">{BUSINESS_MODEL_LABELS[project.basicInfo.businessModel]}</Badge>
          </div>
          {project.basicInfo.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.basicInfo.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/edit`} />}>
            <Pencil /> Edit assumptions
          </Button>
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/report`} />}>
            <FileOutput /> Export report
          </Button>
        </div>
      </div>

      <ScoreHero scores={scores} />
      <ScoreBreakdown scores={scores} />
      <KeyMetricsGrid metrics={metrics} scores={scores} currency={project.basicInfo.currency} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InsightsPanel report={insights} />
        <div className="space-y-6">
          <DecisionSummary summary={decision} />
          <RecommendedActions items={insights.recommendedActions} />
        </div>
      </div>

      <SensitivityPanel project={project} />
      <ScenarioTable result={scenarios} currency={project.basicInfo.currency} />
      <ForecastCharts project={project} metrics={metrics} />
    </div>
  );
}
