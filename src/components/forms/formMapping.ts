import { resolveSizingMethod } from "@/lib/calculations/market";
import {
  createProjectId,
  defaultMarketFunnel,
  emptyMarketplace,
  emptyPitch,
  emptyRevenueStreams,
  fundingRequirementDefaults,
} from "@/lib/storage/factory";
import { unknownValue, type Project } from "@/types";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

/** The form shape matches Project minus the persistence-only fields (id/timestamps). */
export function projectToFormValues(project: Project): ProjectFormValues {
  const { id: _id, schemaVersion: _schemaVersion, revision: _revision, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = project;
  void _id;
  void _schemaVersion;
  void _revision;
  void _createdAt;
  void _updatedAt;
  // Projects saved before these fields/slices existed don't have them at all —
  // backfill so the form always has a controlled value for every field.
  return {
    ...rest,
    pitch: project.pitch ?? emptyPitch(),
    revenueStreams: project.revenueStreams ?? emptyRevenueStreams(),
    marketplace: project.marketplace ?? emptyMarketplace(),
    market: {
      ...rest.market,
      sizingMethod: rest.market.sizingMethod ?? resolveSizingMethod(rest.market),
      funnel: rest.market.funnel ?? defaultMarketFunnel(),
    },
    pricing: { ...rest.pricing, topCustomersRevenueSharePct: rest.pricing.topCustomersRevenueSharePct ?? unknownValue(0) },
    retention: {
      ...rest.retention,
      monthlyExpansionRevenuePct: rest.retention.monthlyExpansionRevenuePct ?? unknownValue(0),
      monthlyContractionRevenuePct: rest.retention.monthlyContractionRevenuePct ?? unknownValue(0),
    },
    funding: {
      ...fundingRequirementDefaults(),
      ...rest.funding,
      preMoneyValuation: rest.funding.preMoneyValuation ?? unknownValue(0),
    },
  } as ProjectFormValues;
}

export function formValuesToProject(
  values: ProjectFormValues,
  existing?: Pick<Project, "id" | "createdAt" | "schemaVersion" | "revision">
): Project {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? createProjectId(),
    schemaVersion: existing?.schemaVersion ?? 1,
    revision: existing?.revision ?? 1,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...values,
  };
}
