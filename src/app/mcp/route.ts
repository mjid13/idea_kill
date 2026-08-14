import { createHash, randomUUID } from "node:crypto";
import { createMcpHandler, type AuthInfo } from "@modelcontextprotocol/server";
import { createIdeaKillMcpServer } from "@/lib/mcp/server";
import { verifyMcpBearer } from "@/lib/mcp/auth";
import { canonicalMcpUrl } from "@/lib/supabase/env";
import { createBearerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createMcpHandler((context) => {
  if (!context.authInfo) throw new Error("Authentication context missing.");
  return createIdeaKillMcpServer(context.authInfo);
}, { legacy: "stateless", responseMode: "auto" });

function challenge() {
  const metadata = new URL("/.well-known/oauth-protected-resource/mcp", canonicalMcpUrl()).href;
  return Response.json({ error: "invalid_token", error_description: "A valid MCP OAuth bearer token is required." }, {
    status: 401,
    headers: { "WWW-Authenticate": `Bearer resource_metadata="${metadata}"`, "cache-control": "no-store" },
  });
}

function digest(value: unknown) {
  return createHash("sha256").update(String(value ?? "")).digest("hex").slice(0, 16);
}

async function serve(request: Request) {
  const started = performance.now();
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  let authInfo: AuthInfo;
  try { authInfo = await verifyMcpBearer(request); } catch { return challenge(); }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  authInfo.extra = { ...authInfo.extra, ipHash: digest(ip), requestId };
  let toolName = "protocol";
  let projectId: unknown;
  try {
    const body = await request.clone().json();
    toolName = body?.method === "tools/call" ? String(body?.params?.name ?? "unknown") : String(body?.method ?? "protocol");
    projectId = body?.params?.arguments?.project_id;
  } catch {}
  const response = await handler.fetch(request, { authInfo });
  if (response.ok) void createBearerSupabaseClient(authInfo.token).rpc("touch_mcp_connection");
  console.info(JSON.stringify({
    event: "mcp_request", requestId, tool: toolName, status: response.status,
    durationMs: Math.round(performance.now() - started), userHash: digest(authInfo.extra?.userId),
    clientHash: digest(authInfo.clientId), projectHash: projectId ? digest(projectId) : undefined,
  }));
  response.headers.set("x-request-id", requestId);
  return response;
}

export const POST = serve;
export const GET = serve;
export function DELETE() { return new Response("Method not allowed.", { status: 405 }); }
