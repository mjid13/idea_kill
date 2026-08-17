import type { Project } from "@/types";

export const SECTION_KEY_MAP = {
  basic: "basicInfo", market: "market", pricing: "pricing", revenue_streams: "revenueStreams", acquisition: "acquisition",
  retention: "retention", unit_economics: "unitEconomics", costs: "costs", funding: "funding",
  validation: "validation", team: "team", risk: "risk", pitch: "pitch",
  one_pager: "onePager", icp: "icp", value_prop: "valueProp", validation_plan: "validationPlan",
  mvp_scope: "mvpScope", gtm_plan: "gtmPlan", sales_docs: "salesDocs",
  contract_terms: "contractTerms", pilot_report: "pilotReport",
} as const satisfies Record<string, keyof Project>;

export type PublicSection = keyof typeof SECTION_KEY_MAP;

const INTERNAL_TO_PUBLIC = Object.fromEntries(
  Object.entries(SECTION_KEY_MAP).map(([publicName, internalName]) => [internalName, publicName]),
) as Record<string, PublicSection>;

export function normalizeMcpPath(path: string): string {
  const [root, ...rest] = path.split(".");
  const internalRoot = SECTION_KEY_MAP[root as PublicSection];
  return internalRoot ? [internalRoot, ...rest].join(".") : path;
}

export function publicMcpPath(path: string): string {
  const [root, ...rest] = path.split(".");
  const publicRoot = INTERNAL_TO_PUBLIC[root];
  return publicRoot ? [publicRoot, ...rest].join(".") : path;
}

