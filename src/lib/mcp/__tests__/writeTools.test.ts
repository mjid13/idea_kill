import { describe, expect, it, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/server";
import { createEmptyProject } from "@/lib/storage/factory";
import { projectData } from "@/lib/projects/codec";
import type { Project } from "@/types";
import type { McpToolContext } from "../context";
import { registerWriteTools } from "../tools/write";

const projectId = "11111111-1111-4111-8111-111111111111";

function baseProject(): Project {
  const value = createEmptyProject();
  value.basicInfo.name = "Test";
  return { ...value, id: projectId, revision: 3 };
}

interface ToolRegistry {
  _registeredTools: Record<string, { handler: (args: never, extra: unknown) => Promise<{
    structuredContent?: { data: unknown }; isError?: boolean; content: Array<{ text?: string }>;
  }> }>;
}

function harness(project = baseProject()) {
  const rpc = vi.fn(async (_name: string, args: Record<string, unknown>) => ({
    data: {
      id: projectId, name: project.basicInfo.name, schema_version: 1, revision: project.revision + 1,
      data: args.project_data, created_at: project.createdAt, updated_at: new Date().toISOString(),
    },
    error: null,
  }));
  const instance = new McpServer({ name: "test", version: "0.0.0" });
  registerWriteTools(instance, {
    db: { rpc },
    limit: async () => undefined,
    connection: async () => ({ access_mode: "write", status: "active", allow_create: true }),
    requireWrite: async () => ({ access_mode: "write", status: "active", allow_create: true }),
    readProject: async () => project,
    grantedProjects: async () => [project],
  } as unknown as McpToolContext);
  return { rpc, tools: (instance as unknown as ToolRegistry)._registeredTools };
}

const guards = { expected_revision: 3, idempotency_key: "idem-key-123456", reason: "Founder confirmed pricing." };

describe("write tools", () => {
  it("records the public path and reason without copying project values", async () => {
    const { rpc, tools } = harness();
    await tools.update_project.handler({
      project_id: projectId, ...guards,
      changes: [{ path: "one_pager.problem", value: "Manual reconciliation" }],
    } as never, {});
    const audit = rpc.mock.calls[0][1].allowed_changes as {
      reason: string; source: string; changes: Array<Record<string, unknown>>;
    };
    expect(audit.reason).toBe(guards.reason);
    expect(audit.source).toBe("mcp");
    expect(audit.changes[0]).toEqual({ path: "one_pager.problem" });
    expect(audit.changes[0]).not.toHaveProperty("value");
    expect(audit.changes[0]).not.toHaveProperty("previous");
    expect(audit.changes[0]).not.toHaveProperty("internalPath");
  });

  it("keeps long content in the project without copying it into the audit", async () => {
    const { rpc, tools } = harness();
    const essay = "x".repeat(2000);
    await tools.update_project.handler({
      project_id: projectId, ...guards, changes: [{ path: "sales_docs.proposalTemplate", value: essay }],
    } as never, {});
    const call = rpc.mock.calls[0][1] as { allowed_changes: { changes: Array<Record<string, unknown>> }; project_data: Record<string, { proposalTemplate: string }> };
    expect(call.allowed_changes.changes[0]).not.toHaveProperty("value");
    expect(call.project_data.salesDocs.proposalTemplate).toHaveLength(2000);
  });

  it("adds a revenue stream in one call and reports its id", async () => {
    const { rpc, tools } = harness();
    const response = await tools.add_revenue_stream.handler({
      project_id: projectId, ...guards, name: "Implementation", kind: "one_time",
    } as never, {});
    const data = response.structuredContent!.data as { streamId: string; revision: number };
    expect(data.revision).toBe(4);
    const saved = rpc.mock.calls[0][1].project_data as ReturnType<typeof projectData>;
    expect(saved.revenueStreams).toHaveLength(1);
    expect(saved.revenueStreams?.[0].id).toBe(data.streamId);
  });

  it("rejects a stale revision with the current one attached", async () => {
    const { rpc, tools } = harness();
    const response = await tools.update_project.handler({
      project_id: projectId, ...guards, expected_revision: 2,
      changes: [{ path: "one_pager.problem", value: "Anything" }],
    } as never, {});
    expect(response.isError).toBe(true);
    expect(JSON.parse(response.content[0].text!.split("\n")[1]).error).toMatchObject({
      code: "REVISION_CONFLICT", details: { currentRevision: 3 }, retryable: true,
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses to write when the connection is read-only", async () => {
    const instance = new McpServer({ name: "test", version: "0.0.0" });
    registerWriteTools(instance, {
      db: { rpc: vi.fn() }, limit: async () => undefined,
      requireWrite: async () => { throw new Error("FORBIDDEN: This connection is read-only."); },
      readProject: async () => baseProject(),
    } as unknown as McpToolContext);
    const tools = (instance as unknown as ToolRegistry)._registeredTools;
    const response = await tools.update_project.handler({
      project_id: projectId, ...guards, changes: [{ path: "one_pager.problem", value: "Anything" }],
    } as never, {});
    expect(response.isError).toBe(true);
    expect(response.content[0].text).toMatch(/^FORBIDDEN: /);
  });
});
