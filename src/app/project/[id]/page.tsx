"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Header } from "@/components/layout/header";
import { ProjectDashboard } from "@/components/dashboard/ProjectDashboard";
import { Button } from "@/components/ui/button";
import { projectRepository } from "@/lib/storage/localStorageRepository";
import type { Project } from "@/types";

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const t = useTranslations();

  useEffect(() => {
    let active = true;
    projectRepository.getById(params.id).then((p) => {
      if (active) setProject(p);
    });
    return () => {
      active = false;
    };
  }, [params.id]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {project === undefined && <div className="p-10 text-center text-sm text-muted-foreground">{t("Loading…")}</div>}
        {project === null && (
          <div className="mx-auto max-w-md space-y-4 p-10 text-center">
            <p className="text-sm text-muted-foreground">{t("This project could not be found in this browser's storage.")}</p>
            <Button render={<Link href="/projects">{t("Back to projects")}</Link>} />
          </div>
        )}
        {project && <ProjectDashboard project={project} />}
      </main>
    </div>
  );
}
