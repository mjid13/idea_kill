import { describe, expect, it } from "vitest";
import { createEmptyProject } from "@/lib/storage/factory";
import type { Project } from "@/types";
import { applyProjectChanges } from "../mutations";
import { addRevenueStream, applyListOperation, moveRevenueStream, removeRevenueStream } from "../listMutations";

function validProject(): Project {
  const value = createEmptyProject();
  value.basicInfo.name = "Test";
  return value;
}

function withStream(name = "Audit") {
  const project = validProject();
  const added = addRevenueStream(project, { name, kind: "one_time" });
  return { project: added.project, streamId: added.streamId };
}

describe("revenue stream list operations", () => {
  it("adds a stream with a generated id and kind-correct defaults", () => {
    const { project, streamId } = withStream();
    const stream = project.revenueStreams?.find((entry) => entry.id === streamId);
    expect(stream?.name).toBe("Audit");
    expect(stream?.billingPeriod).toBe("one_time");
  });

  it("leaves the input project untouched", () => {
    const project = validProject();
    addRevenueStream(project, { name: "Audit", kind: "recurring" });
    expect(project.revenueStreams).toEqual([]);
  });

  it("edits one stream field through a bracketed path", () => {
    const { project, streamId } = withStream();
    const result = applyProjectChanges(project, [
      { path: `revenueStreams[${streamId}].price.value`, value: 4000, quality: "estimated" },
    ]);
    const stream = result.project.revenueStreams?.find((entry) => entry.id === streamId);
    expect(stream?.price).toEqual({ value: 4000, quality: "estimated" });
    expect(project.revenueStreams?.[0].price.value).toBe(0);
  });

  it("turns a stream's point estimate into a range", () => {
    const { project, streamId } = withStream();
    const result = applyProjectChanges(project, [
      { path: `revenueStreams[${streamId}].price.value`, value: 4000 },
      { path: `revenueStreams[${streamId}].price.range.low`, value: 2500 },
      { path: `revenueStreams[${streamId}].price.range.high`, value: 5000 },
    ]);
    expect(result.project.revenueStreams?.[0].price.range).toEqual({ low: 2500, high: 5000 });
  });

  it("rejects an unknown stream id and reports the ids that exist", () => {
    const { project, streamId } = withStream();
    expect(() => removeRevenueStream(project, "nope")).toThrow(/No item nope/);
    try {
      removeRevenueStream(project, "nope");
    } catch (error) {
      expect((error as { details?: { availableIds?: string[] } }).details?.availableIds).toEqual([streamId]);
    }
  });

  it("returns the removed stream as `previous`, so the audit row can restore it", () => {
    const { project, streamId } = withStream();
    const result = removeRevenueStream(project, streamId);
    expect(result.project.revenueStreams).toEqual([]);
    expect((result.diff[0] as { previous?: { id: string } }).previous?.id).toBe(streamId);
  });

  it("reorders streams and rejects an out-of-range index", () => {
    const first = withStream("First");
    const second = addRevenueStream(first.project, { name: "Second", kind: "recurring" });
    const moved = moveRevenueStream(second.project, second.streamId, 0);
    expect(moved.project.revenueStreams?.map((stream) => stream.name)).toEqual(["Second", "First"]);
    expect(() => moveRevenueStream(second.project, second.streamId, 9)).toThrow(/to_index/);
  });

  it("enforces the schema's maximum number of streams", () => {
    let project = validProject();
    for (let index = 0; index < 12; index += 1) {
      project = addRevenueStream(project, { name: `Stream ${index}`, kind: "recurring" }).project;
    }
    expect(() => addRevenueStream(project, { name: "Thirteenth", kind: "recurring" })).toThrow(/invalid/i);
  });

  it("still accepts a wholesale array replacement", () => {
    const { project } = withStream();
    const replacement = [{
      id: "rs_manual", name: "Manual", kind: "recurring", price: { value: 10, quality: "known" },
      billingPeriod: "monthly", attachRatePct: { value: 100, quality: "estimated" },
      unitsPerCustomerPerMonth: { value: 1, quality: "estimated" }, deliveryCostPct: { value: 0, quality: "unknown" },
    }];
    const result = applyProjectChanges(project, [{ path: "revenueStreams", value: replacement }]);
    expect(result.project.revenueStreams?.map((stream) => stream.id)).toEqual(["rs_manual"]);
  });
});

describe("document list operations", () => {
  it("appends an item and generates its id", () => {
    const result = applyListOperation(validProject(), {
      path: "validation_plan.interviewQuestions", operation: "append", item: { text: "Would you pay for this?" },
    });
    const questions = result.project.validationPlan?.interviewQuestions ?? [];
    expect(questions).toHaveLength(1);
    expect(questions[0].id).toBeTruthy();
  });

  it("replaces an item while keeping its id", () => {
    const appended = applyListOperation(validProject(), {
      path: "mvp_scope.acceptanceCriteria", operation: "append", item: { text: "Signs up" },
    });
    const id = appended.project.mvpScope?.acceptanceCriteria?.[0].id as string;
    const replaced = applyListOperation(appended.project, {
      path: "mvp_scope.acceptanceCriteria", operation: "replace_item", itemId: id, item: { text: "Signs up in under a minute" },
    });
    expect(replaced.project.mvpScope?.acceptanceCriteria?.[0]).toEqual({ id, text: "Signs up in under a minute" });
  });

  it("moves an order-sensitive item", () => {
    let project = validProject();
    for (const text of ["One", "Two"]) {
      project = applyListOperation(project, { path: "sales_docs.demoScript", operation: "append", item: { text } }).project;
    }
    const second = project.salesDocs?.demoScript?.[1].id as string;
    const moved = applyListOperation(project, {
      path: "sales_docs.demoScript", operation: "move", itemId: second, toIndex: 0,
    });
    expect(moved.project.salesDocs?.demoScript?.map((step) => step.text)).toEqual(["Two", "One"]);
  });

  it("refuses a list that is not editable item by item", () => {
    expect(() => applyListOperation(validProject(), {
      path: "market.stages" as never, operation: "append", item: {},
    })).toThrow(/not editable/);
  });

  it("rejects an item the schema does not accept, leaving the project untouched", () => {
    const project = validProject();
    expect(() => applyListOperation(project, {
      path: "validation_plan.interviewQuestions", operation: "append", item: { text: "" },
    })).toThrow(/invalid/i);
    expect(project.validationPlan?.interviewQuestions ?? []).toEqual([]);
  });
});
