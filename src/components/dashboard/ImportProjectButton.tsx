"use client";

import { useRef, useState } from "react";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseImportBundle, ImportError } from "@/lib/export/importData";
import { projectRepository } from "@/lib/storage/browserRepository";
import type { Project } from "@/types";

/** Pairs with ExportMenu's JSON export — reads a previously exported project back in as a new project. */
export function ImportProjectButton({ onImported }: { onImported: (project: Project) => void }) {
  const t = useAppTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: File[]) {
    setError(null);
    try {
      let last: Project | undefined;
      for (const file of files) {
        const project = parseImportBundle(await file.text());
        await (projectRepository.saveImported?.(project) ?? projectRepository.save(project));
        last = project;
      }
      if (last) onImported(last);
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
        multiple
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) void handleFiles(files);
        }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
