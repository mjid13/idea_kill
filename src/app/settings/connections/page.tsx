import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

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
