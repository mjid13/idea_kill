import { z } from "zod";

// Business-building documents, built after the Viability Report. Deliberately
// separate from projectFormSchema — like pitchDeckSchema, these are only ever
// edited from within their own document view, never the main wizard.

export const onePagerSchema = z.object({
  problem: z.string().optional(),
  customer: z.string().optional(),
  solution: z.string().optional(),
  differentiation: z.string().optional(),
  useOfFunds: z.string().optional(),
});

export type OnePagerFormValues = z.infer<typeof onePagerSchema>;

export const icpSchema = z.object({
  customerProfile: z.string().optional(),
  buyerDecisionMaker: z.string().optional(),
  painPoints: z.string().optional(),
  currentAlternatives: z.string().optional(),
  buyingTriggers: z.string().optional(),
});

export type IcpFormValues = z.infer<typeof icpSchema>;

export const valuePropSchema = z.object({
  whatYouSell: z.string().optional(),
  customerOutcome: z.string().optional(),
  scope: z.string().optional(),
  whyBuyNow: z.string().optional(),
});

export type ValuePropFormValues = z.infer<typeof valuePropSchema>;

export const validationInterviewQuestionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Required"),
});

export const validationPlanSchema = z.object({
  interviewQuestions: z.array(validationInterviewQuestionSchema),
  targetInterviews: z.number().finite().optional(),
  successFailureCriteria: z.string().optional(),
});

export type ValidationPlanFormValues = z.infer<typeof validationPlanSchema>;

export const acceptanceCriterionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Required"),
});

export const mvpScopeSchema = z.object({
  mustHaveFunctionality: z.string().optional(),
  explicitlyExcluded: z.string().optional(),
  userFlow: z.string().optional(),
  acceptanceCriteria: z.array(acceptanceCriterionSchema),
});

export type MvpScopeFormValues = z.infer<typeof mvpScopeSchema>;

export const prospectListItemSchema = z.object({
  id: z.string(),
  company: z.string().min(1, "Required"),
  contact: z.string().optional(),
  status: z.string().optional(),
});

export const gtmPlanSchema = z.object({
  acquisitionChannels: z.string().optional(),
  salesProcess: z.string().optional(),
  messaging: z.string().optional(),
  prospectList: z.array(prospectListItemSchema),
  salesTargets: z.number().finite().optional(),
});

export type GtmPlanFormValues = z.infer<typeof gtmPlanSchema>;

export const demoScriptStepSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Required"),
});

export const faqItemSchema = z.object({
  id: z.string(),
  question: z.string().min(1, "Required"),
  answer: z.string().optional(),
});

export const salesDocsSchema = z.object({
  demoScript: z.array(demoScriptStepSchema),
  proposalTemplate: z.string().optional(),
  faq: z.array(faqItemSchema),
});

export type SalesDocsFormValues = z.infer<typeof salesDocsSchema>;

export const contractTermsSchema = z.object({
  scope: z.string().optional(),
  payment: z.string().optional(),
  ip: z.string().optional(),
  liability: z.string().optional(),
  cancellation: z.string().optional(),
  supportTerms: z.string().optional(),
});

export type ContractTermsFormValues = z.infer<typeof contractTermsSchema>;

export const pilotAssumptionStatusSchema = z.enum(["open", "confirmed", "invalidated"]);

export const pilotAssumptionUpdateSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Required"),
  status: pilotAssumptionStatusSchema,
});

export const pilotLogEntrySchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Required"),
  text: z.string().optional(),
});

export const pilotFeedbackItemSchema = z.object({
  id: z.string(),
  quote: z.string().min(1, "Required"),
  source: z.string().optional(),
});

export const pilotDecisionSchema = z.enum(["continue", "pivot", "kill"]);

export const pilotReportSchema = z.object({
  whoContacted: z.string().optional(),
  whatHappened: z.array(pilotLogEntrySchema),
  salesResults: z.string().optional(),
  customerFeedback: z.array(pilotFeedbackItemSchema),
  updatedAssumptions: z.array(pilotAssumptionUpdateSchema),
  decision: pilotDecisionSchema.optional(),
});

export type PilotReportFormValues = z.infer<typeof pilotReportSchema>;
