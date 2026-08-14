import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const mcpUrl = process.env.MCP_RESOURCE_URL
  ?? `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/mcp`;
function CodeBlock({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed"><code>{children}</code></pre>;
}

export default async function ConnectionsPage() {
  if (process.env.MCP_CONNECTIONS_ENABLED !== "true") redirect("/projects");
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/sign-in?next=/settings/connections");
  const { data: connections } = await supabase.from("mcp_connections")
    .select("client_id,client_name,client_uri,access_mode,status,created_at,last_used_at,mcp_project_grants(project_id,projects(name))")
    .order("created_at", { ascending: false });
  const { data: projects } = await supabase.from("projects").select("id,name").order("name");
  const { data: audits } = await supabase.from("project_audit_events")
    .select("id,action,project_id,client_id,revision_before,revision_after,changes,created_at")
    .order("created_at", { ascending: false }).limit(50);
  return <div className="min-h-screen"><Header /><main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
    <div><h1 className="text-2xl font-semibold">MCP connections</h1>
      <p className="text-sm text-muted-foreground">Manage client access and review recent safe mutations.</p></div>
<Card><CardContent className="space-y-5 pt-6">
  <div><h2 className="text-lg font-semibold">Connect your AI tool</h2><p className="mt-1 text-sm text-muted-foreground">IdeaKill uses MCP (Model Context Protocol) to let supported AI tools securely read your projects. Add the server once, then sign in with IdeaKill when the tool opens the OAuth page.</p></div>
  <div className="rounded-lg border bg-background p-3"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">MCP server URL</p><code className="mt-1 block break-all text-sm">{mcpUrl}</code><p className="mt-2 text-xs text-muted-foreground">Never share an access token here. Authentication is handled by OAuth.</p></div>
  <div className="space-y-4">
    <div><h3 className="font-medium">Codex CLI</h3><p className="mt-1 text-sm text-muted-foreground">Run these commands in a terminal:</p><CodeBlock>{"codex mcp add ideakill --url " + mcpUrl + " --oauth-resource " + mcpUrl + "\n\ncodex mcp login ideakill"}</CodeBlock><p className="mt-2 text-xs text-muted-foreground">A browser opens for OAuth. Verify later with <code>codex mcp get ideakill</code>.</p></div>
    <div><h3 className="font-medium">Claude Code</h3><p className="mt-1 text-sm text-muted-foreground">Add the remote HTTP server, then authenticate from inside Claude Code:</p><CodeBlock>{"claude mcp add --transport http --scope user ideakill " + mcpUrl + "\n\nclaude"}</CodeBlock><p className="mt-2 text-xs text-muted-foreground">In Claude Code, type <code>/mcp</code>, choose <code>ideakill</code>, and complete OAuth. Verify with <code>claude mcp list</code>.</p></div>
    <div><h3 className="font-medium">Claude Desktop or another MCP client</h3><p className="mt-1 text-sm text-muted-foreground">Choose “Add remote MCP server” (or Streamable HTTP), enter the URL above, and select OAuth when prompted.</p></div>
  </div>
  <div className="rounded-lg border border-dashed p-3 text-sm"><p className="font-medium">Using ChatGPT on the web?</p><p className="mt-1 text-muted-foreground">The standard chatgpt.com interface does not expose a custom MCP URL for every account. If your account has custom MCP support, add this URL from its Apps or MCP settings; otherwise use Codex, Claude Code, or an API client.</p></div>
  <details className="rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-medium">Troubleshooting</summary><ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground"><li>Make sure the URL ends in <code>/mcp</code> and uses <code>https://</code> in production.</li><li>If the client reports a 404 or “no authorization support,” the server deployment is unavailable or outdated.</li><li>Reconnect with the client’s OAuth flow instead of pasting a Supabase or access token.</li></ul></details>
</CardContent></Card>
    {(connections ?? []).map((connection) => <Card key={connection.client_id}><CardContent className="space-y-2">
      <div className="flex justify-between"><strong>{connection.client_name}</strong><span>{connection.status}</span></div>
      <p className="text-sm">Mode: {connection.access_mode} · Connected: {new Date(connection.created_at).toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">Last used: {connection.last_used_at ? new Date(connection.last_used_at).toLocaleString() : "Never"}</p>
      <form action="/api/settings/connections" method="post" className="space-y-2 rounded border p-3">
        <input type="hidden" name="operation" value="update" />
        <input type="hidden" name="clientId" value={connection.client_id} />
        <label className="block text-sm">Mode <select name="mode" defaultValue={connection.access_mode} className="ml-2 rounded border bg-background p-1"><option value="read">Read only</option><option value="write">Read/write</option></select></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" name="allowCreate" value="true" />Allow project creation</label>
        <div className="text-sm">{(projects ?? []).map((project) => <label key={project.id} className="mr-3 inline-flex gap-1"><input type="checkbox" name="projectIds" value={project.id} defaultChecked={(connection.mcp_project_grants as Array<{ project_id: string }>).some((grant) => grant.project_id === project.id)} />{project.name}</label>)}</div>
        <button className="text-sm underline" type="submit">Save permissions</button>
      </form>
      <form action="/api/settings/connections" method="post">
        <input type="hidden" name="clientId" value={connection.client_id} />
        <input type="hidden" name="_method" value="DELETE" />
        <button className="text-sm text-destructive underline" type="submit">Revoke connection</button>
      </form>
    </CardContent></Card>)}
    <section><h2 className="mb-2 font-semibold">Recent audit events</h2>
      <pre className="max-h-96 overflow-auto rounded-lg border p-3 text-xs">{JSON.stringify(audits ?? [], null, 2)}</pre></section>
  </main></div>;
}
