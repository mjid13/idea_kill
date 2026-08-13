"use client";

import { useEffect, useState } from "react";
import type { Project } from "@/types";

const STORAGE_KEY = "pvc:projects:v1";

export function LegacyMigrationNotice() {
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
        if (Array.isArray(value)) setProjects(value);
      } catch {}
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!projects.length) return null;
  function download() {
    projects.forEach((project, index) => {
      const normalized = { ...project, schemaVersion: 1, revision: 1 };
      const blob = new Blob([JSON.stringify({ project: normalized }, null, 2)], { type: "application/json" });
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `legacy-project-${index + 1}.json`;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
    });
  }
  return <aside className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
    <strong>{projects.length} legacy browser project{projects.length === 1 ? "" : "s"} detected.</strong>
    <p>Your old data remains untouched. Download it, then use Import project to copy it into your authenticated account.</p>
    <button className="mt-2 underline" onClick={download}>Download legacy project files</button>
  </aside>;
}
