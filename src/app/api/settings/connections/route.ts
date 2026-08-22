import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requestOrigin } from "@/lib/http/requestOrigin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Grant changes are as consequential as writes — they decide which projects a
 * client can see at all — so they land in the same audit table the owner
 * already reviews. `project_audit_events` requires a project, so one row is
 * written per affected project.
 */
async function recordGrantChange(
  supabase: SupabaseClient, userId: string, clientId: string, projectIds: string[], change: Record<string, unknown>,
) {
  if (!projectIds.length) return;
  const { data: projects } = await supabase.from("projects").select("id,revision").in("id", projectIds);
  const rows = (projects ?? []).map((project) => ({
    user_id: userId, project_id: project.id, client_id: clientId, action: "grant_change" as const,
    revision_before: null, revision_after: project.revision,
    changes: { source: "settings", ...change },
  }));
  if (rows.length) await supabase.from("project_audit_events").insert(rows);
}

export async function POST(request: Request) {
  if (process.env.MCP_CONNECTIONS_ENABLED !== "true") return Response.json({ error: "MCP connections are disabled." }, { status: 404 });
  const form = await request.formData();
  const clientId = String(form.get("clientId") ?? "");
  const operation = String(form.get("operation") ?? form.get("_method") ?? "");
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return Response.json({ error: "Sign in required." }, { status: 401 });
  const { data: previousGrants } = await supabase.from("mcp_project_grants").select("project_id").eq("client_id", clientId);
  const previousIds = (previousGrants ?? []).map((grant) => grant.project_id as string);

  if (operation === "update") {
    const mode = form.get("mode") === "write" ? "write" : "read";
    // create_project_with_mcp_grant requires write mode *and* allow_create, so a
    // read-only connection showing "allow project creation" would be a lie.
    const allowCreate = mode === "write" && form.get("allowCreate") === "true";
    const projectIds = form.getAll("projectIds").map(String);
    const { data: owned } = await supabase.from("projects").select("id").in("id", projectIds.length ? projectIds : ["00000000-0000-0000-0000-000000000000"]);
    if ((owned ?? []).length !== projectIds.length) return Response.json({ error: "Invalid project selection." }, { status: 400 });
    await supabase.from("mcp_connections").update({ access_mode: mode, allow_create: allowCreate, updated_at: new Date().toISOString() }).eq("client_id", clientId);
    await supabase.from("mcp_project_grants").delete().eq("client_id", clientId);
    if (projectIds.length) await supabase.from("mcp_project_grants").insert(projectIds.map((projectId) => ({ user_id: userId, client_id: clientId, project_id: projectId })));
    const granted = projectIds.filter((id) => !previousIds.includes(id));
    const revoked = previousIds.filter((id) => !projectIds.includes(id));
    await recordGrantChange(supabase, userId, clientId, granted, { operation: "granted", mode, allowCreate });
    await recordGrantChange(supabase, userId, clientId, revoked, { operation: "grant_removed", mode, allowCreate });
    return NextResponse.redirect(new URL("/settings/connections", requestOrigin(request)), { status: 303 });
  }

  const { error } = await supabase.auth.oauth.revokeGrant({ clientId });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  await supabase.from("mcp_connections").update({
    status: "revoked", revoked_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("client_id", clientId);
  await recordGrantChange(supabase, userId, clientId, previousIds, { operation: "connection_revoked" });
  return NextResponse.redirect(new URL("/settings/connections", requestOrigin(request)), { status: 303 });
}
