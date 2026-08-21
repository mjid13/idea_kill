"use client";

import { useLocale } from "next-intl";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Card, CardContent } from "@/components/ui/card";
import { getMcpClientSetups } from "@/lib/mcp/clientSetup";

export interface McpConnectionRow {
  clientId: string;
  clientName: string;
  accessMode: string;
  allowCreate: boolean;
  status: string;
  createdAt: string;
  lastUsedAt: string | null;
  grantedProjectIds: string[];
}
export interface McpProjectRow { id: string; name: string }

interface Props {
  mcpUrl: string;
  connections: McpConnectionRow[];
  projects: McpProjectRow[];
  audits: unknown[];
}

interface AuditEvent {
  action: string;
  client_id: string | null;
  revision_before: number | null;
  revision_after: number;
  created_at: string;
  changes: unknown;
}

/**
 * Audit `changes` has three shapes in the wild: the create RPC's
 * `[{path, operation}]`, an MCP write's `{reason, source, changes[]}`, and a
 * grant change's `{source, operation}`. All three are summarised here so the
 * owner reads field names, not JSON.
 */
function describeChanges(changes: unknown): string[] {
  if (Array.isArray(changes)) {
    return changes.map((entry) => {
      const row = entry as { path?: string; operation?: string };
      return `${row.operation ?? "set"} ${row.path ?? ""}`.trim();
    });
  }
  if (changes && typeof changes === "object") {
    const record = changes as { reason?: string; operation?: string; changes?: Array<{ path?: string; op?: string }> };
    const lines = record.changes?.map((entry) => `${entry.op ?? "set"} ${entry.path ?? ""}`.trim()) ?? [];
    if (record.operation) lines.push(record.operation);
    if (record.reason) lines.push(`"${record.reason}"`);
    return lines;
  }
  return [];
}

function AuditRow({ audit, formatDateTime }: { audit: AuditEvent; formatDateTime: (value: string) => string }) {
  const lines = describeChanges(audit.changes);
  return <div className="rounded border p-2">
    <div className="flex flex-wrap justify-between gap-2">
      <span className="font-medium">{audit.action}</span>
      <span className="text-muted-foreground">
        {audit.client_id ?? "app"} · r{audit.revision_before ?? "—"}→r{audit.revision_after} · {formatDateTime(audit.created_at)}
      </span>
    </div>
    {lines.length > 0 && <ul className="mt-1 list-disc pl-4 text-muted-foreground">
      {lines.map((line, index) => <li key={index}>{line}</li>)}
    </ul>}
  </div>;
}

const ACCESS_MODE_LABELS: Record<string, string> = { read: "Read only", write: "Read/write" };
const STATUS_LABELS: Record<string, string> = { active: "Active", pending: "Pending", revoked: "Revoked" };

function CodeBlock({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed"><code>{children}</code></pre>;
}

export function McpConnectionsView({ mcpUrl, connections, projects, audits }: Props) {
  const t = useAppTranslations();
  const locale = useLocale();
  const formatDateTime = (value: string) => new Date(value).toLocaleString(locale);
  const clientSetups = getMcpClientSetups(mcpUrl);
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
    <div><h1 className="text-2xl font-semibold">MCP</h1>
      <p className="text-sm text-muted-foreground">{t("Manage client access and review recent safe mutations.")}</p></div>
<Card><CardContent className="space-y-5 pt-6">
  <div><h2 className="text-lg font-semibold">{t("Connect our AI tool")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("IdeaUp uses MCP (Model Context Protocol) to let supported AI tools securely read our projects. Add the server once, then sign in with IdeaUp when the tool opens the OAuth page.")}</p></div>
  <div className="rounded-lg border bg-background p-3"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("MCP server URL")}</p><code className="mt-1 block break-all text-sm">{mcpUrl}</code><p className="mt-2 text-xs text-muted-foreground">{t("Never share an access token here. Authentication is handled by OAuth.")}</p></div>
  <div className="space-y-4">
    {clientSetups.map((setup) => <div key={setup.id}>
      <h3 className="font-medium">{t(setup.title)}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t(setup.description)}</p>
      {setup.command && <CodeBlock>{setup.command}</CodeBlock>}
      <p className="mt-2 text-xs text-muted-foreground">{t(setup.verification)}</p>
    </div>)}
  </div>
  <details className="rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-medium">{t("Troubleshooting")}</summary><ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground"><li>{t("Make sure the URL ends in /mcp and uses https:// in production.")}</li><li>{t("If the client reports a 404 or “no authorization support,” the server deployment is unavailable or outdated.")}</li><li>{t("Reconnect with the client’s OAuth flow instead of pasting a Supabase or access token.")}</li></ul></details>
</CardContent></Card>
    {connections.map((connection) => <Card key={connection.clientId}><CardContent className="space-y-2">
      <div className="flex justify-between"><strong>{connection.clientName}</strong><span>{t(STATUS_LABELS[connection.status] ?? connection.status)}</span></div>
      <p className="text-sm">{t("Mode: {mode} · Connected: {date}", {
        mode: t(ACCESS_MODE_LABELS[connection.accessMode] ?? connection.accessMode),
        date: formatDateTime(connection.createdAt),
      })}</p>
      <p className="text-xs text-muted-foreground">{t("Last used: {date}", {
        date: connection.lastUsedAt ? formatDateTime(connection.lastUsedAt) : t("Never"),
      })}</p>
      <form action="/api/settings/connections" method="post" className="space-y-2 rounded border p-3">
        <input type="hidden" name="operation" value="update" />
        <input type="hidden" name="clientId" value={connection.clientId} />
        <label className="block text-sm">{t("Mode")} <select name="mode" defaultValue={connection.accessMode} className="ml-2 rounded border bg-background p-1"><option value="read">{t("Read only")}</option><option value="write">{t("Read/write")}</option></select></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" name="allowCreate" value="true" defaultChecked={connection.allowCreate} />{t("Allow project creation")}</label>
        <div className="text-sm">{projects.map((project) => <label key={project.id} className="mr-3 inline-flex gap-1"><input type="checkbox" name="projectIds" value={project.id} defaultChecked={connection.grantedProjectIds.includes(project.id)} />{project.name}</label>)}</div>
        <button className="text-sm underline" type="submit">{t("Save permissions")}</button>
      </form>
      <form action="/api/settings/connections" method="post">
        <input type="hidden" name="clientId" value={connection.clientId} />
        <input type="hidden" name="_method" value="DELETE" />
        <button className="text-sm text-destructive underline" type="submit">{t("Revoke connection")}</button>
      </form>
    </CardContent></Card>)}
    <section><h2 className="mb-2 font-semibold">{t("Recent audit events")}</h2>
      <div className="max-h-96 space-y-2 overflow-auto rounded-lg border p-3 text-xs">
        {audits.length === 0 ? <p className="text-muted-foreground">{t("No activity yet.")}</p>
          : audits.map((audit, index) => <AuditRow key={index} audit={audit as AuditEvent} formatDateTime={formatDateTime} />)}
      </div></section>
  </main>;
}
