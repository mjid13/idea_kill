import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (process.env.MCP_CONNECTIONS_ENABLED !== "true") return Response.json({ error: "MCP connections are disabled." }, { status: 404 });
  const form = await request.formData();
  const clientId = String(form.get("clientId") ?? "");
  const operation = String(form.get("operation") ?? form.get("_method") ?? "");
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (operation === "update") {
    const mode = form.get("mode") === "write" ? "write" : "read";
    const projectIds = form.getAll("projectIds").map(String);
    const { data: owned } = await supabase.from("projects").select("id").in("id", projectIds.length ? projectIds : ["00000000-0000-0000-0000-000000000000"]);
    if ((owned ?? []).length !== projectIds.length) return Response.json({ error: "Invalid project selection." }, { status: 400 });
    await supabase.from("mcp_connections").update({ access_mode: mode, allow_create: form.get("allowCreate") === "true", updated_at: new Date().toISOString() }).eq("client_id", clientId);
    await supabase.from("mcp_project_grants").delete().eq("client_id", clientId);
    if (projectIds.length) await supabase.from("mcp_project_grants").insert(projectIds.map((projectId) => ({ user_id: claims.claims.sub, client_id: clientId, project_id: projectId })));
    return NextResponse.redirect(new URL("/settings/connections", request.url), { status: 303 });
  }
  const { error } = await supabase.auth.oauth.revokeGrant({ clientId });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  await supabase.from("mcp_connections").update({
    status: "revoked", revoked_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("client_id", clientId);
  return NextResponse.redirect(new URL("/settings/connections", request.url), { status: 303 });
}
