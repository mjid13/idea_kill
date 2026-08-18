import { describe, expect, it } from "vitest";
import { z } from "zod";
import { DomainError } from "@/lib/projects/errors";
import { errorPayload, mcpFailure, toDomainError } from "../errors";

describe("MCP error mapping", () => {
  it("passes a DomainError through with its code and details", () => {
    const error = toDomainError(new DomainError("RATE_LIMITED", "Slow down.", { retryAfterSeconds: 30 }));
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.details).toEqual({ retryAfterSeconds: 30 });
  });

  it("turns a schema failure into VALIDATION_FAILED with the issues", () => {
    const parsed = z.object({ value: z.number() }).safeParse({ value: "no" });
    const error = toDomainError(parsed.error);
    expect(error.code).toBe("VALIDATION_FAILED");
    expect((error.details as { issues: unknown[] }).issues).toHaveLength(1);
  });

  it("parses the revision conflict the mutation RPC raises", () => {
    const error = toDomainError({ message: "REVISION_CONFLICT:7:2026-08-18T10:00:00Z" });
    expect(error.code).toBe("REVISION_CONFLICT");
    expect(error.details).toEqual({ currentRevision: 7, updatedAt: "2026-08-18T10:00:00Z" });
  });

  it("maps a unique-violation on the idempotency index to DUPLICATE_REQUEST", () => {
    expect(toDomainError({ code: "23505", message: "duplicate key value" }).code).toBe("DUPLICATE_REQUEST");
  });

  it("never leaks raw database text to a client", () => {
    const error = toDomainError({ code: "42P01", message: 'relation "secret_table" does not exist' });
    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.message).not.toContain("secret_table");
  });

  it("keeps the legacy first line so existing clients keep matching on it", () => {
    const failure = mcpFailure(new DomainError("NOT_FOUND", "Project is not granted or does not exist."));
    expect(failure.isError).toBe(true);
    expect(failure.content[0].text.split("\n")[0]).toBe("NOT_FOUND: Project is not granted or does not exist.");
    expect(JSON.parse(failure.content[0].text.split("\n")[1])).toEqual({
      error: { code: "NOT_FOUND", message: "Project is not granted or does not exist.", retryable: false },
    });
  });

  it("hints only where the fix is mechanical", () => {
    expect(errorPayload(new DomainError("REVISION_CONFLICT", "changed")).hint).toMatch(/get_project/);
    expect(errorPayload(new DomainError("NOT_FOUND", "gone")).hint).toBeUndefined();
  });
});
