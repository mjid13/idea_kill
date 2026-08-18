import { beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/lib/projects/errors";
import { COST, enforceRateLimit, resetRateLimits } from "../rateLimit";

describe("MCP rate limiting", () => {
  beforeEach(resetRateLimits);

  it("charges each call its own cost", () => {
    // A simulation costs 10, so a 120-point read budget is gone on the 13th call.
    for (let call = 0; call < 12; call += 1) enforceRateLimit("user:monte_carlo", { cost: COST.simulation });
    expect(() => enforceRateLimit("user:monte_carlo", { cost: COST.simulation })).toThrow(/Rate limit/);
  });

  it("keeps separate buckets independent", () => {
    for (let call = 0; call < 120; call += 1) enforceRateLimit("user:read");
    expect(() => enforceRateLimit("user:read")).toThrow();
    expect(() => enforceRateLimit("user:write", { limit: 20, cost: COST.write })).not.toThrow();
  });

  it("reports how long the caller has to wait", () => {
    for (let call = 0; call < 20; call += 1) enforceRateLimit("user:write", { limit: 20, cost: 1 });
    try {
      enforceRateLimit("user:write", { limit: 20, cost: 1 });
      expect.unreachable("expected the limiter to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      const seconds = (error as DomainError).details?.retryAfterSeconds as number;
      expect(seconds).toBeGreaterThan(0);
      expect(seconds).toBeLessThanOrEqual(60);
    }
  });
});
