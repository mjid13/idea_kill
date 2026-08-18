import type { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/lib/projects/errors";

const windows = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;

export interface RateLimitOptions {
  /** Budget consumed per window. Reads share one budget; writes get a smaller one. */
  limit?: number;
  /**
   * How much of the budget this call costs. Bounding work per request is what
   * actually protects a serverless deployment, where the in-process counter
   * below only sees one instance's traffic.
   */
  cost?: number;
}

export const COST = {
  read: 1,
  analysis: 2,
  heavy: 3,
  simulation: 10,
  write: 5,
} as const;

function consumeLocal(key: string, limit: number, cost: number) {
  const now = Date.now();
  const existing = windows.get(key);
  const entry = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : existing;
  entry.count += cost;
  windows.set(key, entry);
  if (entry.count > limit) throw new DomainError("RATE_LIMITED", "Rate limit exceeded.", {
    retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
  });
}

export function enforceRateLimit(key: string, options: RateLimitOptions = {}) {
  consumeLocal(key, options.limit ?? 120, options.cost ?? COST.read);
}

/**
 * Durable counterpart to `enforceRateLimit`. The in-process map still runs
 * first (it rejects a runaway loop without a round trip); this adds the
 * cross-instance ceiling. If the RPC is missing — the migration has not been
 * applied to this environment yet — the local counter stands alone rather than
 * failing the request.
 */
export async function enforceDurableRateLimit(
  db: SupabaseClient, bucket: string, key: string, options: RateLimitOptions = {},
) {
  const limit = options.limit ?? 120;
  const cost = options.cost ?? COST.read;
  consumeLocal(key, limit, cost);
  const { data, error } = await db.rpc("consume_mcp_rate_limit", {
    bucket_name: bucket, request_cost: cost, max_requests: limit, window_seconds: WINDOW_MS / 1000,
  });
  if (error) return;
  const row = Array.isArray(data) ? data[0] : data;
  if (row && row.allowed === false) throw new DomainError("RATE_LIMITED", "Rate limit exceeded.", {
    retryAfterSeconds: row.retry_after_seconds ?? 60,
  });
}

/** Test seam — the window map is module state that would otherwise leak between cases. */
export function resetRateLimits() {
  windows.clear();
}
