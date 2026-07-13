import * as z from "zod";

export const promptScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  clarity: z.number().int().min(0).max(25),
  specificity: z.number().int().min(0).max(25),
  motionDirection: z.number().int().min(0).max(25),
  feasibility: z.number().int().min(0).max(25),
  feedback: z.array(z.string().min(1).max(240)).min(1).max(6),
});

export type PromptScore = z.infer<typeof promptScoreSchema>;

export const promptFeedbackSchema = z.object({
  originalScore: promptScoreSchema,
  optimizedScore: promptScoreSchema,
});

export type PromptFeedback = z.infer<typeof promptFeedbackSchema>;

export const optimizedPromptSchema = z.object({
  optimizedPrompt: z.string().min(20).max(4000),
  originalScore: promptScoreSchema,
  score: promptScoreSchema,
});

export type OptimizedPrompt = z.infer<typeof optimizedPromptSchema>;

export const promptOptimizationViewSchema = optimizedPromptSchema.extend({
  optimizationId: z.string().uuid(),
  originalPrompt: z.string().min(20).max(4_000),
});

export type PromptOptimizationView = z.infer<
  typeof promptOptimizationViewSchema
>;

export const generatedAnimationSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(280),
  durationSeconds: z.number().int().min(2).max(10),
  html: z.string().min(80).max(100_000),
});

export type GeneratedAnimation = z.infer<typeof generatedAnimationSchema>;

export type AnimationView = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  description: string | null;
  originalPrompt: string;
  optimizedPrompt: string;
  promptScore: number;
  promptFeedback: PromptFeedback;
  html: string;
  durationSeconds: number;
  status: "READY" | "FAILED";
  generationError: string | null;
  videoStatus:
    | "NOT_REQUESTED"
    | "QUEUED"
    | "PROCESSING"
    | "SUCCEEDED"
    | "FAILED";
  videoFormat: string | null;
  videoMimeType: string | null;
  videoError: string | null;
  videoAttempts: number;
  videoDownloadPath: string | null;
};

export type UsageLogView = {
  id: string;
  createdAt: Date;
  operation: string;
  status: string;
  totalTokens: number;
  estimatedCostMicros: number;
  latencyMs: number | null;
  errorCode: string | null;
};

export type AiStudioDashboard = {
  animations: AnimationView[];
  usage: {
    hourlyLimit: number;
    hourlyTokenLimit: number;
    usedThisHour: number;
    tokensUsedThisHour: number;
    inFlight: number;
    remainingThisHour: number;
    totalTokens: number;
    estimatedCostMicros: number;
  };
  logs: UsageLogView[];
};
