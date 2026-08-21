import type { BusinessModel } from "@/types";

/**
 * The handful of content archetypes documents actually branch on. Mirrors the
 * SaaS-like/Marketplace/Service/E-commerce/One-time grouping already used for
 * scoring benchmarks (src/lib/scoring/benchmarks.ts) so a project's document
 * content and its benchmark curves agree on what "SaaS-like" means, without
 * document code importing the scoring module's benchmark data.
 */
export type BusinessModelArchetype = "saas_like" | "marketplace" | "service" | "ecommerce" | "one_time";

const ARCHETYPE_BY_MODEL: Record<BusinessModel, BusinessModelArchetype> = {
  saas: "saas_like",
  subscription: "saas_like",
  usage_based: "saas_like",
  marketplace: "marketplace",
  ecommerce: "ecommerce",
  one_time: "one_time",
  service: "service",
  other: "service",
};

export function getArchetype(businessModel: BusinessModel): BusinessModelArchetype {
  return ARCHETYPE_BY_MODEL[businessModel];
}
