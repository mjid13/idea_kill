"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ConsentProject { id: string; name: string }
interface Props {
  authorizationId: string; clientName: string; clientUri: string; redirectUri: string;
  projects: ConsentProject[];
}

export function ConsentForm(props: Props) {
  const [mode, setMode] = useState<"read" | "write">("read");
  const [selected, setSelected] = useState<string[]>([]);
  const [allowCreate, setAllowCreate] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function decide(approved: boolean) {
    setBusy(true); setError(undefined);
    const response = await fetch("/api/oauth/consent", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ authorizationId: props.authorizationId, approved, mode, projectIds: selected, allowCreate }),
    });
    const body = await response.json();
    if (!response.ok) { setError(body.error ?? "Authorization failed."); setBusy(false); return; }
    window.location.assign(body.redirectUrl);
  }
  return <div className="space-y-6">
    <div className="rounded-lg border p-4 text-sm">
      <p><strong>{props.clientName}</strong> requests access.</p>
      <p className="break-all text-muted-foreground">Client: {props.clientUri || "No website supplied"}</p>
      <p className="break-all text-muted-foreground">Redirect: {props.redirectUri}</p>
    </div>
    <fieldset className="space-y-2">
      <legend className="font-medium">Access level</legend>
      <label className="flex gap-2"><input type="radio" checked={mode === "read"} onChange={() => setMode("read")} /> Read only</label>
      <label className="flex gap-2"><input type="radio" checked={mode === "write"} onChange={() => setMode("write")} /> Read and safely update</label>
    </fieldset>
    <fieldset className="space-y-2">
      <legend className="font-medium">Projects (none selected by default)</legend>
      {props.projects.map((project) => <label key={project.id} className="flex gap-2">
        <input type="checkbox" checked={selected.includes(project.id)} onChange={(event) =>
          setSelected((ids) => event.target.checked ? [...ids, project.id] : ids.filter((id) => id !== project.id))} />
        {project.name}
      </label>)}
      <label className="flex gap-2"><input type="checkbox" checked={allowCreate}
        onChange={(event) => setAllowCreate(event.target.checked)} /> Allow this client to create new projects</label>
    </fieldset>
    {error && <p className="text-sm text-destructive">{error}</p>}
    <div className="flex gap-2">
      <Button disabled={busy || (selected.length === 0 && !allowCreate)} onClick={() => decide(true)}>Allow access</Button>
      <Button disabled={busy} variant="outline" onClick={() => decide(false)}>Deny</Button>
    </div>
  </div>;
}
