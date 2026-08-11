import { z } from "zod";

// Deliberately separate from projectFormSchema/ProjectWizard — these fields
// are only ever edited from within the Pitch Deck view, never the main
// "evaluate an idea" wizard (spec: keep the core viability-check flow
// lightweight; only ask for deck-only detail when someone actually wants a
// deck).

export const tractionDataPointSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Required"),
  customers: z.number().finite().optional(),
  mrr: z.number().finite().optional(),
});

export const pitchTeamMemberSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Required"),
  role: z.string().min(1, "Required"),
  bio: z.string().optional(),
});

export const pitchCompetitorSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Required"),
  edge: z.string(),
});

export const fundingRoundTypeSchema = z.enum(["pre_seed", "seed", "series_a", "series_b_plus", "bridge"]);

export const pitchRoundDetailsSchema = z.object({
  roundType: fundingRoundTypeSchema.optional(),
  valuation: z.number().finite().optional(),
  previousInvestors: z.string().optional(),
});

export const pitchDeckDetailsSchema = z.object({
  tractionHistory: z.array(tractionDataPointSchema),
  teamMembers: z.array(pitchTeamMemberSchema),
  competitors: z.array(pitchCompetitorSchema),
  round: pitchRoundDetailsSchema,
});

export type PitchDeckDetailsFormValues = z.infer<typeof pitchDeckDetailsSchema>;
