import "server-only";

import type { AuthInfo } from "@modelcontextprotocol/server";
import { createBearerSupabaseClient } from "@/lib/supabase/server";
import { SupabaseProjectRepository } from "@/lib/projects/repository";
import { DomainError } from "@/lib/projects/errors";
import type { Project } from "@/types";
import { COST, enforceDurableRateLimit, type RateLimitOptions } from "./rateLimit";

export interface McpConnection { access_mode: "read" | "write"; status: string; allow_create: boolean }

export interface McpToolContext {
  auth: AuthInfo;
  db: ReturnType<typeof createBearerSupabaseClient>;
  repository: SupabaseProjectRepository;
  connection(): Promise<McpConnection>;
  /** Charges the caller's budget for `bucket` and enforces the connection is live. */
  limit(bucket: string, options?: RateLimitOptions): Promise<void>;
  readProject(id: string): Promise<Project>;
  /** All granted projects, fetched at most once per request. */
  grantedProjects(): Promise<Project[]>;
  requireWrite(needsCreate?: boolean): Promise<McpConnection>;
}

export function createMcpContext(auth: AuthInfo): McpToolContext {
  const db = createBearerSupabaseClient(auth.token);
  const repository = new SupabaseProjectRepository(db);
  const identity = `${auth.extra?.userId}:${auth.clientId}:${auth.extra?.ipHash}`;
  let connectionPromise: Promise<McpConnection> | undefined;
  let projectsPromise: Promise<Project[]> | undefined;

  async function connection() {
    connectionPromise ??= (async () => {
      const { data, error } = await db.from("mcp_connections").select("access_mode,status,allow_create")
        .eq("client_id", auth.clientId).maybeSingle();
      if (error || !data || data.status !== "active") {
        throw new DomainError("GRANT_REVOKED", "Connection is not active.");
      }
      return data as McpConnection;
    })();
    return connectionPromise;
  }

  async function limit(bucket: string, options: RateLimitOptions = {}) {
    await connection();
    await enforceDurableRateLimit(db, bucket, `${identity}:${bucket}`, options);
  }

  return {
    auth, db, repository, connection, limit,
    async readProject(id: string) {
      await limit("read");
      const project = await repository.getById(id);
      // RLS returns nothing for a project this client was not granted, so
      // "missing" and "not granted" are deliberately indistinguishable here.
      if (!project) throw new DomainError("NOT_FOUND", "Project is not granted or does not exist.");
      return project;
    },
    async grantedProjects() {
      // Memoized per server instance, which in stateless mode means per request:
      // resource listing and completion both need the same list.
      projectsPromise ??= repository.getAll();
      return projectsPromise;
    },
    async requireWrite(needsCreate = false) {
      const active = await connection();
      if (process.env.MCP_WRITES_ENABLED !== "true") {
        throw new DomainError("FORBIDDEN", "Writes are disabled on this deployment.");
      }
      if (active.access_mode !== "write") {
        throw new DomainError("FORBIDDEN", "This connection is read-only.");
      }
      if (needsCreate && !active.allow_create) {
        throw new DomainError("FORBIDDEN", "The owner has not allowed project creation for this client.");
      }
      return active;
    },
  };
}

export { COST };
