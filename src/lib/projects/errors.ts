export type DomainErrorCode =
  | "NOT_FOUND" | "FORBIDDEN" | "VALIDATION_FAILED" | "REVISION_CONFLICT"
  | "GRANT_REVOKED" | "DUPLICATE_REQUEST" | "RATE_LIMITED" | "INTERNAL_ERROR";

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
