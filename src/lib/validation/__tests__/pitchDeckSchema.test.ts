import { describe, expect, it } from "vitest";
import { pitchDeckDetailsSchema, pitchRoundDetailsSchema, tractionDataPointSchema, pitchTeamMemberSchema, pitchCompetitorSchema } from "../pitchDeckSchema";

const emptyDeck = {
  tractionHistory: [],
  teamMembers: [],
  competitors: [],
  round: {},
};

describe("pitchDeckDetailsSchema", () => {
  it("accepts an empty deck (nothing filled in yet)", () => {
    expect(pitchDeckDetailsSchema.safeParse(emptyDeck).success).toBe(true);
  });

  it("accepts a fully populated deck", () => {
    const result = pitchDeckDetailsSchema.safeParse({
      tractionHistory: [{ id: "1", label: "Jan 2026", customers: 50, mrr: 2500 }],
      teamMembers: [{ id: "1", name: "Ada", role: "Founder & CEO", bio: "Ex-accountant." }],
      competitors: [{ id: "1", name: "Zapier", edge: "Zero-config templates." }],
      round: { roundType: "seed", valuation: 5_000_000, previousInvestors: "Regional accelerator" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a traction point whose label is empty", () => {
    const result = tractionDataPointSchema.safeParse({ id: "1", label: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a team member missing a name or role", () => {
    expect(pitchTeamMemberSchema.safeParse({ id: "1", name: "", role: "CTO" }).success).toBe(false);
    expect(pitchTeamMemberSchema.safeParse({ id: "1", name: "Ada", role: "" }).success).toBe(false);
  });

  it("allows a competitor with a blank edge (not everyone has articulated it yet)", () => {
    const result = pitchCompetitorSchema.safeParse({ id: "1", name: "Zapier", edge: "" });
    expect(result.success).toBe(true);
  });

  it("rejects a competitor missing a name", () => {
    expect(pitchCompetitorSchema.safeParse({ id: "1", name: "", edge: "" }).success).toBe(false);
  });

  it("rejects an unknown funding round type", () => {
    const result = pitchRoundDetailsSchema.safeParse({ roundType: "series_z" });
    expect(result.success).toBe(false);
  });

  it("allows round details to be entirely omitted", () => {
    expect(pitchRoundDetailsSchema.safeParse({}).success).toBe(true);
  });
});
