import { ZodError } from "zod";
import { DomainError, type DomainErrorCode } from "@/lib/projects/errors";

/** Codes worth retrying without the caller changing anything about the request. */
const RETRYABLE: ReadonlySet<DomainErrorCode> = new Set(["RATE_LIMITED", "REVISION_CONFLICT", "INTERNAL_ERROR"]);

/**
 * What a model should do next. Populated only where the fix is mechanical —
 * a hint that says "try again" teaches nothing and wastes a turn.
 */
const HINTS: Partial<Record<DomainErrorCode, string>> = {
  REVISION_CONFLICT: "Re-read the project with get_project and retry with the current revision.",
  VALIDATION_FAILED: "Call get_writable_paths for this project to see every writable path and its unit.",
  RATE_LIMITED: "Wait for retryAfterSeconds before the next call.",
  GRANT_REVOKED: "The owner must reconnect this client at /settings/connections.",
};

/** `REVISION_CONFLICT:<revision>:<updated_at>` is raised by apply_project_mutation. */
const REVISION_CONFLICT = /REVISION_CONFLICT:(\d+):(.+?)(?:$|\s)/;

function postgres(error: { message?: string; code?: string; details?: string }): DomainError {
  const message = error.message ?? "";
  const conflict = REVISION_CONFLICT.exec(message);
  if (conflict) return new DomainError("REVISION_CONFLICT", "The project changed since it was read.", {
    currentRevision: Number(conflict[1]), updatedAt: conflict[2],
  });
  if (error.code === "23505" || /idempotency/i.test(message)) {
    return new DomainError("DUPLICATE_REQUEST", "This idempotency key was already used for a different request.");
  }
  if (message.startsWith("FORBIDDEN")) return new DomainError("FORBIDDEN", "This client is not allowed to perform that write.");
  if (message.startsWith("NOT_FOUND")) return new DomainError("NOT_FOUND", "Project is not granted or does not exist.");
  // Never echo raw database text back to a client: it can carry schema and
  // policy details the OAuth client was never granted.
  return new DomainError("INTERNAL_ERROR", "The request could not be completed.");
}

export function toDomainError(error: unknown): DomainError {
  if (error instanceof DomainError) return error;
  if (error instanceof ZodError) {
    return new DomainError("VALIDATION_FAILED", "The request does not match the expected shape.", { issues: error.issues });
  }
  if (error && typeof error === "object" && ("code" in error || "message" in error)) {
    return postgres(error as { message?: string; code?: string });
  }
  return new DomainError("INTERNAL_ERROR", "The request could not be completed.");
}

export function errorPayload(error: DomainError) {
  return {
    code: error.code,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
    retryable: RETRYABLE.has(error.code),
    ...(HINTS[error.code] ? { hint: HINTS[error.code] } : {}),
  };
}

/**
 * The first line stays byte-identical to the old `throw new Error("CODE: msg")`
 * wire text so existing clients that match on it keep working; the structured
 * detail arrives on line two. The SDK skips outputSchema validation when
 * `isError` is set, so no output schema needs to describe this shape.
 */
export function mcpFailure(error: unknown) {
  const domain = toDomainError(error);
  const payload = errorPayload(domain);
  return {
    isError: true,
    content: [{ type: "text" as const, text: `${domain.code}: ${domain.message}\n${JSON.stringify({ error: payload })}` }],
    _meta: { "ideaup/error": { code: payload.code, retryable: payload.retryable } },
  };
}

/** Wraps a tool callback so every failure leaves as a structured tool error. */
export function guard<Args extends unknown[], Result>(handler: (...args: Args) => Promise<Result>) {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return mcpFailure(error) as Result;
    }
  };
}
