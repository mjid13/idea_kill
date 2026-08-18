import { beforeAll, describe, expect, it } from "vitest";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { SECTION_KEY_MAP } from "../paths";

/** Registration touches no network — the Supabase client is constructed lazily per call. */
const auth = {
  token: "test-token", clientId: "test-client", scopes: [], expiresAt: undefined,
  resource: new URL("http://localhost:3000/mcp"), extra: { userId: "user-1", ipHash: "hash" },
} as unknown as AuthInfo;

const TOOLS = [
  "add_revenue_stream", "compare_projects", "create_project", "edit_list", "export_project",
  "get_benchmarks", "get_example_project", "get_investor_assessment", "get_lender_assessment",
  "get_missing_assumptions", "get_project", "get_project_analysis", "get_writable_paths",
  "import_project", "list_documents", "list_projects", "remove_revenue_stream",
  "reorder_revenue_streams", "run_monte_carlo", "run_scenario", "suggest_document_content", "update_project",
];

const PROMPTS = [
  "assess_downside_risk", "assess_investor_readiness", "challenge_assumptions", "compare_ideas",
  "draft_business_document", "fill_missing_assumptions", "improve_unit_economics",
  "prepare_founder_review", "prioritize_validation", "underwrite_as_lender",
];

const COMPUTED_RESOURCE_KINDS = ["summary", "assumptions", "analysis", "financial_model", "lender", "investor", "documents"];

interface Registry {
  _registeredTools: Record<string, { title?: string; annotations?: { readOnlyHint?: boolean } }>;
  _registeredPrompts: Record<string, unknown>;
  _registeredResources: Record<string, unknown>;
  _registeredResourceTemplates: Record<string, unknown>;
}

let registry: Registry;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
  const { createIdeaUpMcpServer } = await import("../server");
  registry = createIdeaUpMcpServer(auth) as unknown as Registry;
});

/**
 * A renamed or dropped tool breaks every connected client silently, so the
 * registered names are pinned here rather than left to review.
 */
describe("registered MCP surface", () => {
  it("registers exactly the documented tools", () => {
    expect(Object.keys(registry._registeredTools).sort()).toEqual(TOOLS);
  });

  it("registers exactly the documented prompts", () => {
    expect(Object.keys(registry._registeredPrompts).sort()).toEqual(PROMPTS);
  });

  it("exposes every stored section and every computed view as a resource", () => {
    const templates = Object.keys(registry._registeredResourceTemplates);
    for (const kind of [...COMPUTED_RESOURCE_KINDS, ...Object.keys(SECTION_KEY_MAP)]) {
      expect(templates).toContain(`project-${kind}`);
    }
    expect(Object.keys(registry._registeredResources)).toEqual(expect.arrayContaining(["ideaup://projects", "ideaup://example"]));
    expect(templates).toContain("benchmarks");
  });

  it("gives every tool a human title", () => {
    for (const [name, tool] of Object.entries(registry._registeredTools)) {
      expect(tool.title, name).toBeTruthy();
    }
  });

  it("marks every read tool read-only", () => {
    const writes = new Set([
      "create_project", "update_project", "import_project",
      "add_revenue_stream", "remove_revenue_stream", "reorder_revenue_streams", "edit_list",
    ]);
    for (const [name, tool] of Object.entries(registry._registeredTools)) {
      if (writes.has(name)) expect(tool.annotations?.readOnlyHint, name).toBe(false);
      else expect(tool.annotations?.readOnlyHint, name).toBe(true);
    }
  });
});
