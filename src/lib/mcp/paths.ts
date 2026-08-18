import type { Project } from "@/types";

export const SECTION_KEY_MAP = {
  basic: "basicInfo", market: "market", pricing: "pricing", revenue_streams: "revenueStreams",
  marketplace: "marketplace", acquisition: "acquisition",
  retention: "retention", unit_economics: "unitEconomics", costs: "costs", funding: "funding",
  debt: "debt", validation: "validation", team: "team", risk: "risk", pitch: "pitch",
  one_pager: "onePager", icp: "icp", value_prop: "valueProp", validation_plan: "validationPlan",
  mvp_scope: "mvpScope", gtm_plan: "gtmPlan", sales_docs: "salesDocs",
  contract_terms: "contractTerms", pilot_report: "pilotReport",
} as const satisfies Record<string, keyof Project>;

export type PublicSection = keyof typeof SECTION_KEY_MAP;

const INTERNAL_TO_PUBLIC = Object.fromEntries(
  Object.entries(SECTION_KEY_MAP).map(([publicName, internalName]) => [internalName, publicName]),
) as Record<string, PublicSection>;

/**
 * Splits `revenue_streams[rs_1].price.value` into its mappable root, the item
 * selector that must survive the mapping untouched, and the remainder. Without
 * this, a bracketed root never matches the section map — which also bites
 * Monte Carlo, whose `collectRangedFields` already emits `[0]`-style paths.
 */
function splitRoot(path: string): { root: string; selector: string; rest: string } {
  const dot = path.indexOf(".");
  const head = dot === -1 ? path : path.slice(0, dot);
  const rest = dot === -1 ? "" : path.slice(dot + 1);
  const bracket = head.indexOf("[");
  return bracket === -1
    ? { root: head, selector: "", rest }
    : { root: head.slice(0, bracket), selector: head.slice(bracket), rest };
}

function rejoin(root: string, selector: string, rest: string): string {
  return `${root}${selector}${rest ? `.${rest}` : ""}`;
}

export function normalizeMcpPath(path: string): string {
  const { root, selector, rest } = splitRoot(path);
  const internalRoot = SECTION_KEY_MAP[root as PublicSection];
  return internalRoot ? rejoin(internalRoot, selector, rest) : path;
}

export function publicMcpPath(path: string): string {
  const { root, selector, rest } = splitRoot(path);
  const publicRoot = INTERNAL_TO_PUBLIC[root];
  return publicRoot ? rejoin(publicRoot, selector, rest) : path;
}
