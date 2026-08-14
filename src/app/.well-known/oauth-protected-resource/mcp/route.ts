import { canonicalMcpUrl, supabaseEnv } from "@/lib/supabase/env";

export function GET() {
  const { url } = supabaseEnv();
  return Response.json({
    resource: canonicalMcpUrl(),
    authorization_servers: [`${url.replace(/\/$/, "")}/auth/v1`],
    bearer_methods_supported: ["header"],
    scopes_supported: ["openid", "email", "profile"],
  }, { headers: { "cache-control": "public, max-age=300" } });
}
