import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { McpConnectionsView } from "@/components/settings/McpConnectionsView";

export const dynamic = "force-dynamic";

const mcpUrl = process.env.MCP_RESOURCE_URL
  ?? `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/mcp`;

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
  return <div className="min-h-screen"><Header />
    <McpConnectionsView
      mcpUrl={mcpUrl}
      connections={(connections ?? []).map((connection) => ({
        clientId: connection.client_id,
        clientName: connection.client_name,
        accessMode: connection.access_mode,
        status: connection.status,
        createdAt: connection.created_at,
        lastUsedAt: connection.last_used_at,
        grantedProjectIds: (connection.mcp_project_grants as Array<{ project_id: string }>).map((grant) => grant.project_id),
      }))}
      projects={projects ?? []}
      audits={audits ?? []}
    />
  </div>;
}
