"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, GitCompare, Plus, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { projectRepository } from "@/lib/storage/localStorageRepository";
import { duplicateProject } from "@/lib/storage/factory";
import { calculateMetrics } from "@/lib/calculations";
import { calculateScoreBreakdown, classifyScore } from "@/lib/scoring";
import { BUSINESS_MODEL_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import type { Project } from "@/types";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function refresh() {
    setProjects(await projectRepository.getAll());
  }

  useEffect(() => {
    let active = true;
    projectRepository.getAll().then((all) => {
      if (active) setProjects(all);
    });
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => {
    if (!projects) return [];
    return projects.map((project) => {
      const metrics = calculateMetrics(project);
      const scores = calculateScoreBreakdown(project, metrics);
      return { project, metrics, scores };
    });
  }, [projects]);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    await projectRepository.delete(id);
    setSelected((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
    refresh();
  }

  async function handleDuplicate(project: Project) {
    const copy = duplicateProject(project);
    await projectRepository.save(copy);
    refresh();
  }

  function toggleSelected(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function goCompare() {
    router.push(`/compare?ids=${Array.from(selected).join(",")}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Projects</h1>
              <p className="text-sm text-muted-foreground">Evaluations saved in this browser.</p>
            </div>
            <div className="flex gap-2">
              {selected.size >= 2 && (
                <Button variant="outline" onClick={goCompare}>
                  <GitCompare /> Compare ({selected.size})
                </Button>
              )}
              <Button render={<Link href="/new" />}>
                <Plus /> Evaluate an Idea
              </Button>
            </div>
          </div>

          {projects && projects.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="text-sm text-muted-foreground">You haven&apos;t evaluated any ideas yet.</p>
                <Button render={<Link href="/new" />}>
                  <Plus /> Evaluate your first idea
                </Button>
              </CardContent>
            </Card>
          )}

          {rows.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map(({ project, metrics, scores }) => (
                <Card key={project.id} className="relative">
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1 size-3.5"
                          checked={selected.has(project.id)}
                          onChange={() => toggleSelected(project.id)}
                        />
                        <div>
                          <Link href={`/project/${project.id}`} className="font-medium text-foreground hover:underline">
                            {project.basicInfo.name || "Untitled project"}
                          </Link>
                          <div className="mt-1">
                            <Badge variant="secondary">{BUSINESS_MODEL_LABELS[project.basicInfo.businessModel]}</Badge>
                          </div>
                        </div>
                      </label>
                      <div className="text-right">
                        <p className="text-xl font-semibold tabular-nums text-foreground">{scores.overall}</p>
                        <p className="text-[11px] text-muted-foreground">{classifyScore(scores.overall)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>MRR: {formatCurrency(metrics.revenue.mrr, project.basicInfo.currency, { compact: true })}</span>
                      <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex gap-1.5 border-t border-border pt-3">
                      <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}`}>Open</Link>} className="flex-1" />
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDuplicate(project)} aria-label="Duplicate">
                        <Copy />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(project.id)} aria-label="Delete">
                        <Trash2 />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
