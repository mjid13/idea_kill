import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  authorizationId: z.string().min(1), approved: z.boolean(),
  mode: z.enum(["read", "write"]), projectIds: z.array(z.string().uuid()).max(100),
  allowCreate: z.boolean(),
});

export async function POST(request: Request) {
  if (process.env.MCP_CONNECTIONS_ENABLED !== "true") return Response.json({ error: "MCP connections are disabled." }, { status: 404 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid consent request." }, { status: 400 });
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "Sign in required." }, { status: 401 });
  const { data: details, error: detailsError } = await supabase.auth.oauth.getAuthorizationDetails(parsed.data.authorizationId);
  if (detailsError || !details || "redirect_url" in details) return Response.json({ error: "Authorization expired." }, { status: 400 });
  const userId = String(claims.claims.sub);
  const clientId = details.client.id;
  if (!parsed.data.approved) {
    await supabase.from("mcp_connections").delete().eq("user_id", userId).eq("client_id", clientId).eq("status", "pending");
    const { data, error } = await supabase.auth.oauth.denyAuthorization(parsed.data.authorizationId, { skipBrowserRedirect: true });
    return error ? Response.json({ error: error.message }, { status: 400 }) : Response.json({ redirectUrl: data.redirect_url });
  }
  if (!parsed.data.projectIds.length && !parsed.data.allowCreate) {
    return Response.json({ error: "Select at least one project or allow project creation." }, { status: 400 });
  }
  const { error: connectionError } = await supabase.from("mcp_connections").upsert({
    user_id: userId, client_id: clientId, access_mode: parsed.data.mode,
    client_name: details.client.name.slice(0, 200), client_uri: details.client.uri || null,
    metadata: { logo_uri: details.client.logo_uri || null, redirect_uri: details.redirect_uri },
    status: "pending", allow_create: parsed.data.allowCreate, updated_at: new Date().toISOString(),
    revoked_at: null,
  });
  if (connectionError) return Response.json({ error: connectionError.message }, { status: 400 });
  await supabase.from("mcp_project_grants").delete().eq("user_id", userId).eq("client_id", clientId);
  if (parsed.data.projectIds.length) {
    const { error } = await supabase.from("mcp_project_grants").insert(parsed.data.projectIds.map((projectId) => ({
      user_id: userId, client_id: clientId, project_id: projectId,
    })));
    if (error) {
      await supabase.from("mcp_connections").delete().eq("user_id", userId).eq("client_id", clientId).eq("status", "pending");
      return Response.json({ error: error.message }, { status: 400 });
    }
  }
  const { data: approved, error } = await supabase.auth.oauth.approveAuthorization(parsed.data.authorizationId, { skipBrowserRedirect: true });
  if (error) {
    await supabase.from("mcp_connections").delete().eq("user_id", userId).eq("client_id", clientId).eq("status", "pending");
    return Response.json({ error: error.message }, { status: 400 });
  }
  await supabase.from("mcp_connections").update({ status: "active", updated_at: new Date().toISOString() })
    .eq("user_id", userId).eq("client_id", clientId);
  return Response.json({ redirectUrl: approved.redirect_url });
}
