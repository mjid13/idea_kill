import { projectDocumentSchema, projectFormSchema } from "@/lib/validation/projectSchema";
import type { Project } from "@/types";
import { resolveSizingMethod } from "@/lib/calculations/market";
import {
  fundingRequirementDefaults,
  defaultMarketFunnel,
  emptyDebt,
  emptyMarketplace,
  emptyRevenueStreams,
  emptyOnePager,
  emptyIcp,
  emptyValueProp,
  emptyValidationPlan,
  emptyMvpScope,
  emptyGtmPlan,
  emptySalesDocs,
  emptyContractTerms,
  emptyPilotReport,
} from "@/lib/storage/factory";

export interface ProjectRow {
  id: string;
  name: string;
  schema_version: number;
  revision: number;
  data: unknown;
  created_at: string;
  updated_at: string;
}

export function projectFromRow(row: ProjectRow): Project {
  const parsed = projectFormSchema.parse(row.data);
  // Backfill optional slices (marketplace, business-building documents) for
  // projects saved before they existed. These must be present (not undefined)
  // so their leaf fields are addressable via MCP's update_project.
  const backfilled = {
    ...parsed,
    funding: { ...fundingRequirementDefaults(), ...parsed.funding },
    // Projects saved before the bottom-up funnel existed keep their previous
    // sizing behaviour (direct entry if they carried TAM/SAM/SOM overrides,
    // otherwise the simple model) and get an empty funnel to fill in.
    market: {
      ...parsed.market,
      sizingMethod: parsed.market.sizingMethod ?? resolveSizingMethod(parsed.market),
      funnel: parsed.market.funnel ?? defaultMarketFunnel(),
    },
    debt: { ...emptyDebt(), ...parsed.debt },
    revenueStreams: parsed.revenueStreams ?? emptyRevenueStreams(),
    marketplace: parsed.marketplace ?? emptyMarketplace(),
    onePager: parsed.onePager ?? emptyOnePager(),
    icp: parsed.icp ?? emptyIcp(),
    valueProp: parsed.valueProp ?? emptyValueProp(),
    validationPlan: parsed.validationPlan ?? emptyValidationPlan(),
    mvpScope: parsed.mvpScope ?? emptyMvpScope(),
    gtmPlan: parsed.gtmPlan ?? emptyGtmPlan(),
    salesDocs: parsed.salesDocs ?? emptySalesDocs(),
    contractTerms: parsed.contractTerms ?? emptyContractTerms(),
    pilotReport: parsed.pilotReport ?? emptyPilotReport(),
  };
  return projectDocumentSchema.parse({
    ...backfilled,
    id: row.id,
    schemaVersion: row.schema_version,
    revision: Number(row.revision),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }) as Project;
}

export function projectData(project: Project) {
  return projectFormSchema.parse(project);
}
