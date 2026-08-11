"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseImportBundle, ImportError } from "@/lib/export/importData";
import { projectRepository } from "@/lib/storage/localStorageRepository";
import type { Project } from "@/types";

/** Pairs with ExportMenu's JSON export — reads a previously exported project back in as a new project. */
export function ImportProjectButton({ onImported }: { onImported: (project: Project) => void }) {
  const t = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const project = parseImportBundle(text);
      await projectRepository.save(project);
      onImported(project);
    } catch (err) {
      setError(err instanceof ImportError ? t(err.message) : t("This file isn't valid JSON."));
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        aria-label={t("Import a project from a JSON file exported by this app.")}
      >
        <Upload /> {t("Import project")}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
