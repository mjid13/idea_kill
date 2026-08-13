import { DomainError } from "@/lib/projects/errors";

const windows = new Map<string, { count: number; resetAt: number }>();

export function enforceRateLimit(key: string, write = false) {
  const now = Date.now();
  const limit = write ? 20 : 120;
  const existing = windows.get(key);
  const entry = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + 60_000 } : existing;
  entry.count += 1;
  windows.set(key, entry);
  if (entry.count > limit) throw new DomainError("RATE_LIMITED", "Rate limit exceeded.", {
    retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
  });
}
