import type { McpServer } from "@modelcontextprotocol/server";
import { ResourceTemplate } from "@modelcontextprotocol/server";
import { analyzeProject } from "@/lib/projects/analysis";
import { projectData } from "@/lib/projects/codec";
import { getBenchmarks } from "@/lib/scoring/benchmarks";
import type { BusinessModel } from "@/types";
import type { McpToolContext } from "../context";
import { guard } from "../errors";
import { SECTION_KEY_MAP } from "../paths";
import { resourceResult } from "../result";
import { documentsView } from "../views/documents";
import { exampleView } from "../views/example";
import { financialModelView } from "../views/financialModel";
import { investorView } from "../views/investor";
import { lenderView } from "../views/lender";

/**
 * Computed views (no stored section behind them) plus every section in
 * SECTION_KEY_MAP — so a new stored slice becomes a readable resource by
 * editing one map, which is what the section map promises.
 */
const COMPUTED_KINDS = ["summary", "assumptions", "analysis", "financial_model", "lender", "investor", "documents"];

const CACHE = { cacheScope: "private" as const, ttlMs: 30_000 };
const AUDIENCE = { audience: ["user" as const, "assistant" as const] };

const BUSINESS_MODELS: BusinessModel[] = [
  "saas", "subscription", "marketplace", "ecommerce", "one_time", "service", "usage_based", "other",
];

export function registerResources(server: McpServer, ctx: McpToolContext) {
  server.registerResource("projects", "ideaup://projects", {
    title: "Granted projects", description: "Granted project index.", mimeType: "application/json",
    annotations: AUDIENCE, cacheHint: CACHE,
  }, guard(async (uri: URL) => {
    await ctx.connection();
    return resourceResult(uri.href, (await ctx.grantedProjects()).map((p) => ({
      id: p.id, name: p.basicInfo.name, revision: p.revision, updatedAt: p.updatedAt,
    })));
  }));

  server.registerResource("example", "ideaup://example", {
    title: "Example project", description: "Reference fixture showing the full schema, including ranged assumptions.",
    mimeType: "application/json", annotations: AUDIENCE, cacheHint: CACHE,
  }, guard(async (uri: URL) => {
    await ctx.connection();
    return resourceResult(uri.href, exampleView(false));
  }));

  server.registerResource("benchmarks", new ResourceTemplate("ideaup://benchmarks/{business_model}", {
    list: async () => ({
      resources: BUSINESS_MODELS.map((model) => ({
        uri: `ideaup://benchmarks/${model}`, name: `${model} benchmarks`, mimeType: "application/json",
      })),
    }),
    complete: { business_model: (value: string) => BUSINESS_MODELS.filter((model) => model.startsWith(value)) },
  }), {
    title: "Business-model benchmarks", description: "Scoring anchors per business model.",
    mimeType: "application/json", annotations: AUDIENCE, cacheHint: CACHE,
  }, guard(async (uri: URL, variables: Record<string, unknown>) => {
    await ctx.connection();
    return resourceResult(uri.href, getBenchmarks(String(variables.business_model) as BusinessModel));
  }));

  const kinds = [...COMPUTED_KINDS, ...Object.keys(SECTION_KEY_MAP)];
  for (const kind of kinds) {
    server.registerResource(`project-${kind}`, new ResourceTemplate(`ideaup://projects/{id}/${kind}`, {
      list: async () => ({
        resources: (await ctx.grantedProjects()).map((project) => ({
          uri: `ideaup://projects/${project.id}/${kind}`,
          name: `${project.basicInfo.name} — ${kind}`,
          mimeType: "application/json",
        })),
      }),
      // Opaque UUIDs are the main reason a client cannot address a resource by
      // hand; completion turns them into a pick list.
      complete: {
        id: async (value: string) => (await ctx.grantedProjects())
          .map((project) => project.id).filter((id) => id.startsWith(value)),
      },
    }), {
      title: `Project ${kind}`, description: `Granted project ${kind}.`, mimeType: "application/json",
      annotations: AUDIENCE, cacheHint: CACHE,
    }, guard(async (uri: URL, variables: Record<string, unknown>) => {
      const project = await ctx.readProject(String(variables.id));
      const data = kind === "analysis" ? analyzeProject(project)
        : kind === "assumptions" ? projectData(project)
        : kind === "financial_model" ? financialModelView(project)
        : kind === "lender" ? lenderView(project, { includeSchedule: false, scheduleMonths: 0 })
        : kind === "investor" ? investorView(project)
        : kind === "documents" ? documentsView(project)
        : kind === "summary" ? {
          id: project.id, name: project.basicInfo.name, revision: project.revision,
          updatedAt: project.updatedAt, score: analyzeProject(project, 0).score,
        }
        : project[SECTION_KEY_MAP[kind as keyof typeof SECTION_KEY_MAP]];
      return resourceResult(uri.href, data);
    }));
  }
}
