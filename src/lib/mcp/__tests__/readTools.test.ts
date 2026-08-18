import { describe, expect, it } from "vitest";
import { McpServer } from "@modelcontextprotocol/server";
import { createEmptyProject } from "@/lib/storage/factory";
import { exampleProject } from "@/lib/example";
import { DomainError } from "@/lib/projects/errors";
import type { Project } from "@/types";
import type { McpToolContext } from "../context";
import { registerReadTools } from "../tools/read";

/** Backfilled the way the repository returns projects, so documents exist. */
const project: Project = { ...createEmptyProject(), ...exampleProject, id: "11111111-1111-4111-8111-111111111111" };

interface ToolRegistry {
  _registeredTools: Record<string, { handler: (args: never, extra: unknown) => Promise<{
    structuredContent?: { data: unknown }; isError?: boolean; content: Array<{ text?: string }>;
  }> }>;
}

function server(overrides: Partial<McpToolContext> = {}) {
  const instance = new McpServer({ name: "test", version: "0.0.0" });
  const ctx = {
    limit: async () => undefined,
    connection: async () => ({ access_mode: "read", status: "active", allow_create: false }),
    readProject: async () => project,
    grantedProjects: async () => [project],
    requireWrite: async () => { throw new DomainError("FORBIDDEN", "read-only"); },
    ...overrides,
  } as unknown as McpToolContext;
  registerReadTools(instance, ctx);
  return instance as unknown as ToolRegistry;
}

async function call(name: string, args: Record<string, unknown>, overrides?: Partial<McpToolContext>) {
  return server(overrides)._registeredTools[name].handler(args as never, {});
}

describe("read tools end to end", () => {
  it("returns marketplace and debt like any other section", async () => {
    const response = await call("get_project", { project_id: project.id, include_unknown: true });
    const data = response.structuredContent!.data as { assumptions: Record<string, unknown> };
    expect(Object.keys(data.assumptions)).toEqual(expect.arrayContaining(["marketplace", "debt", "revenue_streams"]));
  });

  it("adds efficiency and the funding requirement only when asked", async () => {
    const lean = await call("get_project_analysis", { project_id: project.id, forecast_months: 12, include: ["score"] });
    expect(Object.keys(lean.structuredContent!.data as object)).toEqual(["score"]);

    const full = await call("get_project_analysis", {
      project_id: project.id, forecast_months: 12, include: ["score", "efficiency", "funding_requirement", "benchmarks"],
    });
    expect(full.structuredContent!.data).toHaveProperty("fundingRequirement");
    expect(full.structuredContent!.data).toHaveProperty("efficiency");
  });

  it("simulates ranged assumptions", async () => {
    const response = await call("run_monte_carlo", { project_id: project.id, iterations: 200, months: 24, seed: 7 });
    expect(response.structuredContent!.data).toMatchObject({ available: true, iterations: 200 });
  });

  it("underwrites and assesses without a schedule dump", async () => {
    const lender = await call("get_lender_assessment", {
      project_id: project.id, include_schedule: false, schedule_months: 60,
    });
    expect(lender.structuredContent!.data).toHaveProperty("verdict");
    expect(lender.structuredContent!.data).not.toHaveProperty("schedule");

    const investor = await call("get_investor_assessment", { project_id: project.id });
    expect(investor.structuredContent!.data).toHaveProperty("verdict");
  });

  it("lists documents with resource links a client can follow", async () => {
    const response = await call("list_documents", { project_id: project.id });
    expect((response.structuredContent!.data as { documents: unknown[] }).documents).toHaveLength(10);
    expect(response.content.some((block) => (block as { type?: string }).type === "resource_link")).toBe(true);
  });

  it("reports writable paths for sections that have no form", async () => {
    const response = await call("get_writable_paths", { project_id: project.id, include_values: false, limit: 2000 });
    const paths = (response.structuredContent!.data as { paths: Array<{ path: string }> }).paths.map((row) => row.path);
    expect(paths).toContain("debt.loanAmount.value");
  });

  it("turns a domain failure into a structured tool error", async () => {
    const response = await call("get_project", { project_id: project.id, include_unknown: true }, {
      readProject: async () => { throw new DomainError("NOT_FOUND", "Project is not granted or does not exist."); },
    });
    expect(response.isError).toBe(true);
    expect(response.content[0].text).toMatch(/^NOT_FOUND: /);
    expect(JSON.parse(response.content[0].text!.split("\n")[1]).error.retryable).toBe(false);
  });

  it("returns benchmarks alongside the project's own figures", async () => {
    const response = await call("get_benchmarks", { project_id: project.id });
    const data = response.structuredContent!.data as { benchmarks: unknown; actuals: { grossMarginPct: number } };
    expect(data.benchmarks).toBeTruthy();
    expect(typeof data.actuals.grossMarginPct).toBe("number");
  });
});
