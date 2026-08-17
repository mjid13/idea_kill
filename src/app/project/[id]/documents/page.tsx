"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { ArrowLeft, ArrowRight, Pencil } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { projectRepository } from "@/lib/storage/browserRepository";
import { DOCUMENT_REGISTRY, DOCUMENT_GROUP_LABELS, type DocumentGroup } from "@/lib/documents/registry";
import { computeDocumentStatus, type DocumentStatus } from "@/lib/documents/status";
import type { Project } from "@/types";

const GROUPS: DocumentGroup[] = ["validate", "build", "sell", "decide"];

const STATUS_LABELS: Record<DocumentStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
};

const STATUS_VARIANTS: Record<DocumentStatus, "outline" | "secondary" | "default"> = {
  not_started: "outline",
  in_progress: "secondary",
  complete: "default",
};

export default function DocumentsHubPage() {
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
        {project && <DocumentsHub project={project} />}
      </main>
    </div>
  );
}

function DocumentsHub({ project }: { project: Project }) {
  const t = useAppTranslations();
  const docsByGroup = useMemo(() => {
    const map = new Map<DocumentGroup, typeof DOCUMENT_REGISTRY>();
    for (const group of GROUPS) map.set(group, []);
    for (const doc of DOCUMENT_REGISTRY) map.get(doc.group)!.push(doc);
    return map;
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-8 space-y-3">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}`} />}>
          <ArrowLeft /> {t("Back to dashboard")}
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("Business documents")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Turn this idea into a business — structured documents built from the assumptions we already entered. Anything that's already known elsewhere is filled in automatically and stays editable."
            )}
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {GROUPS.map((group) => {
          const docs = docsByGroup.get(group) ?? [];
          if (docs.length === 0) return null;
          return (
            <section key={group}>
              <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t(DOCUMENT_GROUP_LABELS[group])}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {docs.map((doc) => {
                  const status = computeDocumentStatus(doc.slug, project);
                  return (
                    <Card key={doc.slug}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle>{t(doc.title)}</CardTitle>
                          <Badge variant={STATUS_VARIANTS[status]}>{t(STATUS_LABELS[status])}</Badge>
                        </div>
                        <CardDescription>{t(doc.description)}</CardDescription>
                      </CardHeader>
                      <CardContent />
                      <CardFooter className="justify-end gap-2 bg-transparent border-t-0 p-(--card-spacing)">
                        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/${doc.slug}`} />}>
                          {t("View")} <ArrowRight />
                        </Button>
                        {doc.hasEdit && (
                          <Button size="sm" render={<Link href={`/project/${project.id}/${doc.slug}/edit`} />}>
                            <Pencil /> {t("Edit")}
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
