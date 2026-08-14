import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { canonicalMcpUrl, supabaseEnv } from "@/lib/supabase/env";
import { DomainError } from "@/lib/projects/errors";

export async function verifyMcpBearer(request: Request): Promise<AuthInfo> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new DomainError("FORBIDDEN", "A bearer token is required.");
  const token = header.slice(7);
  const { url } = supabaseEnv();
  const issuer = `${url.replace(/\/$/, "")}/auth/v1`;
  const { payload } = await jwtVerify(token, createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`)), {
    issuer,
    audience: canonicalMcpUrl(),
  });
  const clientId = typeof payload.client_id === "string"
    ? payload.client_id
    : typeof payload.app_metadata === "object" && payload.app_metadata && "client_id" in payload.app_metadata
      ? String(payload.app_metadata.client_id) : "";
  if (!payload.sub || !clientId) throw new DomainError("FORBIDDEN", "Token is not an OAuth client token.");
  return {
    token,
    clientId,
    scopes: typeof payload.scope === "string" ? payload.scope.split(" ") : [],
    expiresAt: payload.exp,
    resource: new URL(canonicalMcpUrl()),
    extra: { userId: payload.sub },
  };
}
