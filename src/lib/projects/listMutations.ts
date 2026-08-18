import { projectFormSchema } from "@/lib/validation/projectSchema";
import { createProjectId, emptyRevenueStream } from "@/lib/storage/factory";
import type { Project, RevenueStream, RevenueStreamKind } from "@/types";
import { DomainError } from "./errors";
import { cloneProjectData, resolveSegment, validate, type FieldChange } from "./mutations";

/**
 * Public MCP path -> internal path for every list a client may edit item by
 * item. An allowlist rather than a discovery walk: arrays of derived data and
 * arrays the schema treats as one value must stay whole-document writes.
 */
export const EDITABLE_LISTS = {
  "market.funnel.stages": "market.funnel.stages",
  "pitch.competitors": "pitch.competitors",
  "pitch.teamMembers": "pitch.teamMembers",
  "pitch.tractionHistory": "pitch.tractionHistory",
  "validation_plan.interviewQuestions": "validationPlan.interviewQuestions",
  "mvp_scope.acceptanceCriteria": "mvpScope.acceptanceCriteria",
  "gtm_plan.prospectList": "gtmPlan.prospectList",
  "sales_docs.demoScript": "salesDocs.demoScript",
  "sales_docs.faq": "salesDocs.faq",
  "pilot_report.whatHappened": "pilotReport.whatHappened",
  "pilot_report.customerFeedback": "pilotReport.customerFeedback",
  "pilot_report.updatedAssumptions": "pilotReport.updatedAssumptions",
} as const;

export type EditableListPath = keyof typeof EDITABLE_LISTS;

export type ListOperation = "append" | "replace_item" | "remove" | "move";

export interface ListOperationInput {
  path: EditableListPath;
  operation: ListOperation;
  item?: unknown;
  /** Item id or index for replace_item / remove / move. */
  itemId?: string;
  toIndex?: number;
}

export interface RevenueStreamAdd {
  name: string;
  kind: RevenueStreamKind;
  assumptions?: Record<string, unknown>;
}

interface Applied { project: Project; diff: FieldChange[] }

function documentOf(project: Project) {
  return cloneProjectData(projectFormSchema.parse(project)) as unknown as Record<string, unknown>;
}

/** Walks a dotted internal path down to the array it names. */
function locateList(document: Record<string, unknown>, internalPath: string, publicPath: string): unknown[] {
  const segments = internalPath.split(".");
  let parent: Record<string, unknown> = document;
  for (const segment of segments.slice(0, -1)) {
    const resolved = resolveSegment(parent, segment);
    const child = resolved ? (resolved.container as Record<string | number, unknown>)[resolved.key] : undefined;
    if (!child || typeof child !== "object") {
      throw new DomainError("VALIDATION_FAILED", `List is not available on this project: ${publicPath}`, {
        hintPath: publicPath,
      });
    }
    parent = child as Record<string, unknown>;
  }
  const list = parent[segments.at(-1)!];
  if (!Array.isArray(list)) {
    throw new DomainError("VALIDATION_FAILED", `List is not available on this project: ${publicPath}`);
  }
  return list;
}

function indexOfItem(list: unknown[], selector: string, publicPath: string): number {
  const byId = list.findIndex((item) => item && typeof item === "object" && (item as { id?: unknown }).id === selector);
  const index = byId >= 0 ? byId : /^\d+$/.test(selector) ? Number(selector) : -1;
  if (index < 0 || index >= list.length) {
    throw new DomainError("VALIDATION_FAILED", `No item ${selector} in ${publicPath}.`, {
      availableIds: list.map((item, position) =>
        item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"
          ? (item as { id: string }).id : position),
    });
  }
  return index;
}

/** Items that carry an `id` get one generated when the caller omits it. */
function withId(item: unknown, itemId?: string): unknown {
  if (!item || typeof item !== "object" || Array.isArray(item)) return item;
  const record = item as Record<string, unknown>;
  return typeof record.id === "string" && record.id ? record : { ...record, id: itemId ?? createProjectId() };
}

export function applyListOperation(project: Project, input: ListOperationInput): Applied {
  const internalPath = EDITABLE_LISTS[input.path];
  if (!internalPath) throw new DomainError("VALIDATION_FAILED", `List is not editable: ${input.path}`, {
    editableLists: Object.keys(EDITABLE_LISTS),
  });
  const document = documentOf(project);
  const list = locateList(document, internalPath, input.path);
  const diff: FieldChange[] = [];

  if (input.operation === "append") {
    if (input.item === undefined) throw new DomainError("VALIDATION_FAILED", "append requires an item.");
    const item = withId(input.item, input.itemId);
    list.push(item);
    diff.push({ path: `${input.path}[${(item as { id?: string }).id ?? list.length - 1}]`, value: item });
  } else if (input.operation === "replace_item") {
    if (input.itemId === undefined) throw new DomainError("VALIDATION_FAILED", "replace_item requires an item_id.");
    if (input.item === undefined) throw new DomainError("VALIDATION_FAILED", "replace_item requires an item.");
    const index = indexOfItem(list, input.itemId, input.path);
    const previous = list[index];
    // Keep the original id so paths a client is holding stay valid.
    list[index] = withId(input.item, (previous as { id?: string })?.id ?? input.itemId);
    diff.push({ path: `${input.path}[${input.itemId}]`, value: list[index], previous } as FieldChange);
  } else if (input.operation === "remove") {
    if (input.itemId === undefined) throw new DomainError("VALIDATION_FAILED", "remove requires an item_id.");
    const index = indexOfItem(list, input.itemId, input.path);
    const [previous] = list.splice(index, 1);
    // `previous` carries the whole removed item, which is what makes the audit
    // entry enough to restore it by hand.
    diff.push({ path: `${input.path}[${input.itemId}]`, value: null, previous } as FieldChange);
  } else {
    if (input.itemId === undefined || input.toIndex === undefined) {
      throw new DomainError("VALIDATION_FAILED", "move requires an item_id and a to_index.");
    }
    const index = indexOfItem(list, input.itemId, input.path);
    if (input.toIndex < 0 || input.toIndex >= list.length) {
      throw new DomainError("VALIDATION_FAILED", `to_index must be between 0 and ${list.length - 1}.`);
    }
    const [moved] = list.splice(index, 1);
    list.splice(input.toIndex, 0, moved);
    diff.push({ path: `${input.path}[${input.itemId}]`, value: { toIndex: input.toIndex }, previous: { fromIndex: index } } as FieldChange);
  }

  return { project: validate(project, document), diff };
}

export function addRevenueStream(project: Project, input: RevenueStreamAdd): Applied & { streamId: string } {
  const document = documentOf(project);
  const list = Array.isArray(document.revenueStreams) ? document.revenueStreams as RevenueStream[] : [];
  document.revenueStreams = list;
  // The factory already assigns an id and kind-correct billing defaults, so a
  // client only has to send what it actually knows.
  const stream = { ...emptyRevenueStream(input.kind, input.name), ...(input.assumptions ?? {}) } as RevenueStream;
  list.push(stream);
  return {
    project: validate(project, document),
    diff: [{ path: `revenue_streams[${stream.id}]`, value: stream }],
    streamId: stream.id,
  };
}

export function removeRevenueStream(project: Project, streamId: string): Applied {
  const document = documentOf(project);
  const list = Array.isArray(document.revenueStreams) ? document.revenueStreams as RevenueStream[] : [];
  const index = indexOfItem(list, streamId, "revenue_streams");
  const [previous] = list.splice(index, 1);
  return {
    project: validate(project, document),
    diff: [{ path: `revenue_streams[${streamId}]`, value: null, previous } as FieldChange],
  };
}

export function moveRevenueStream(project: Project, streamId: string, toIndex: number): Applied {
  const document = documentOf(project);
  const list = Array.isArray(document.revenueStreams) ? document.revenueStreams as RevenueStream[] : [];
  const index = indexOfItem(list, streamId, "revenue_streams");
  if (toIndex < 0 || toIndex >= list.length) {
    throw new DomainError("VALIDATION_FAILED", `to_index must be between 0 and ${list.length - 1}.`);
  }
  const [moved] = list.splice(index, 1);
  list.splice(toIndex, 0, moved);
  return {
    project: validate(project, document),
    diff: [{ path: `revenue_streams[${streamId}]`, value: { toIndex }, previous: { fromIndex: index } } as FieldChange],
  };
}
