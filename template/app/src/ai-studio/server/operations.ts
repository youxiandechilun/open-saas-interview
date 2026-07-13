import type { PrismaClient } from "@prisma/client";
import type { AiAnimation } from "wasp/entities";
import { HttpError, prisma } from "wasp/server";
import { renderAiAnimationVideoJob as videoJob } from "wasp/server/jobs";
import type {
  GenerateAiAnimation,
  GetAiStudioDashboard,
  OptimizeAiAnimationPrompt,
  RequestAiAnimationVideo,
  RetryAiAnimationVideo,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";
import {
  AI_HOURLY_REQUEST_LIMIT,
  AI_HOURLY_TOKEN_LIMIT,
  AI_MAX_PROMPT_LENGTH,
  isValidIdempotencyKey,
  quotaRemaining,
  startOfUtcHour,
} from "../policy";
import { validateAnimationHtml } from "../security";
import {
  promptFeedbackSchema,
  promptOptimizationViewSchema,
  type AiStudioDashboard,
  type AnimationView,
  type PromptOptimizationView,
  type PromptScore,
} from "../types";
import { generateHtmlAnimation, optimizeAnimationPrompt } from "./aiClient";
import {
  completeUsage,
  failUsage,
  reserveUsage,
  sharedQuotaOperation,
  type Reservation,
} from "./usage";

const idempotencyKeySchema = z
  .string()
  .trim()
  .refine(isValidIdempotencyKey, "Invalid idempotency key");

const optimizeInputSchema = z.object({
  prompt: z.string().trim().min(20).max(AI_MAX_PROMPT_LENGTH),
  idempotencyKey: idempotencyKeySchema,
});

const generateInputSchema = z.object({
  optimizationId: z.string().uuid(),
  idempotencyKey: idempotencyKeySchema,
});

const videoInputSchema = z.object({
  animationId: z.string().uuid(),
  format: z.enum(["mp4", "webm"]),
  idempotencyKey: idempotencyKeySchema,
});

export const optimizeAiAnimationPrompt: OptimizeAiAnimationPrompt<
  z.infer<typeof optimizeInputSchema>,
  PromptOptimizationView
> = async (rawArgs, context) => {
  const userId = requireUserId(context.user);
  const args = ensureArgsSchemaOrThrowHttpError(optimizeInputSchema, rawArgs);
  const reservation = await reserveUsage({
    userId,
    operation: "PROMPT_OPTIMIZE",
    idempotencyKey: args.idempotencyKey,
  });
  const replay = replayJsonOrThrow(reservation, promptOptimizationViewSchema);
  if (replay) return replay;
  ensureReserved(reservation);

  const startedAt = Date.now();
  let usageSettled = false;
  try {
    const result = await optimizeAnimationPrompt(args.prompt);
    enforceScoreInvariant(result.value);
    const optimization = {
      ...result.value,
      optimizationId: reservation.usageLogId,
      originalPrompt: args.prompt,
    } satisfies PromptOptimizationView;
    await completeUsage({
      usageLogId: reservation.usageLogId,
      windowStart: reservation.windowStart,
      userId,
      reservedTokens: reservation.reservedTokens,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      latencyMs: Date.now() - startedAt,
      responseJson: optimization,
    });
    usageSettled = true;
    return optimization;
  } catch (error) {
    if (!usageSettled) {
      await failUsage({
        usageLogId: reservation.usageLogId,
        windowStart: reservation.windowStart,
        userId,
        reservedTokens: reservation.reservedTokens,
        errorCode: errorCode(error),
        latencyMs: Date.now() - startedAt,
      });
    }
    throw toProviderHttpError(error);
  }
};

export const generateAiAnimation: GenerateAiAnimation<
  z.infer<typeof generateInputSchema>,
  AnimationView
> = async (rawArgs, context) => {
  const userId = requireUserId(context.user);
  const args = ensureArgsSchemaOrThrowHttpError(generateInputSchema, rawArgs);
  const optimizationLog = await context.entities.AiUsageLog.findFirst({
    where: {
      id: args.optimizationId,
      userId,
      operation: "PROMPT_OPTIMIZE",
      status: "SUCCEEDED",
    },
    select: { responseJson: true },
  });
  if (!optimizationLog) {
    throw new HttpError(404, "Prompt optimization not found");
  }
  const optimization = promptOptimizationViewSchema.safeParse(
    optimizationLog.responseJson,
  );
  if (!optimization.success) {
    throw new HttpError(409, "Prompt optimization result is unavailable");
  }
  enforceScoreInvariant(optimization.data);
  const reservation = await reserveUsage({
    userId,
    operation: "HTML_GENERATE",
    idempotencyKey: args.idempotencyKey,
  });

  if (reservation.kind === "existing") {
    if (
      reservation.usage.status === "SUCCEEDED" &&
      reservation.usage.animationId
    ) {
      const animation = await context.entities.AiAnimation.findFirst({
        where: { id: reservation.usage.animationId, userId },
      });
      if (animation) return toAnimationView(animation);
    }
    throwExistingReservation(reservation);
  }
  ensureReserved(reservation);

  const startedAt = Date.now();
  let usageSettled = false;
  try {
    const result = await generateHtmlAnimation(
      optimization.data.optimizedPrompt,
    );
    const validation = validateAnimationHtml(result.value.html);
    if (!validation.ok) {
      const failedAnimation = await context.entities.AiAnimation.create({
        data: {
          userId,
          title: result.value.title,
          description: result.value.description,
          originalPrompt: optimization.data.originalPrompt,
          optimizedPrompt: optimization.data.optimizedPrompt,
          promptScore: optimization.data.score.score,
          promptFeedback: {
            originalScore: optimization.data.originalScore,
            optimizedScore: optimization.data.score,
          },
          html: "",
          durationSeconds: result.value.durationSeconds,
          status: "FAILED",
          generationError: validation.reason,
        },
      });
      await failUsage({
        usageLogId: reservation.usageLogId,
        windowStart: reservation.windowStart,
        userId,
        reservedTokens: reservation.reservedTokens,
        errorCode: "UNSAFE_HTML",
        latencyMs: Date.now() - startedAt,
        animationId: failedAnimation.id,
      });
      usageSettled = true;
      throw new HttpError(422, validation.reason);
    }

    const animation = await context.entities.AiAnimation.create({
      data: {
        userId,
        title: result.value.title,
        description: result.value.description,
        originalPrompt: optimization.data.originalPrompt,
        optimizedPrompt: optimization.data.optimizedPrompt,
        promptScore: optimization.data.score.score,
        promptFeedback: {
          originalScore: optimization.data.originalScore,
          optimizedScore: optimization.data.score,
        },
        html: result.value.html,
        durationSeconds: result.value.durationSeconds,
        status: "READY",
      },
    });
    await completeUsage({
      usageLogId: reservation.usageLogId,
      windowStart: reservation.windowStart,
      userId,
      reservedTokens: reservation.reservedTokens,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      latencyMs: Date.now() - startedAt,
      animationId: animation.id,
      responseJson: { animationId: animation.id },
    });
    usageSettled = true;
    return toAnimationView(animation);
  } catch (error) {
    if (!usageSettled) {
      await failUsage({
        usageLogId: reservation.usageLogId,
        windowStart: reservation.windowStart,
        userId,
        reservedTokens: reservation.reservedTokens,
        errorCode: errorCode(error),
        latencyMs: Date.now() - startedAt,
      });
    }
    throw toProviderHttpError(error);
  }
};

export const requestAiAnimationVideo: RequestAiAnimationVideo<
  z.infer<typeof videoInputSchema>,
  AnimationView
> = async (rawArgs, context) => {
  const userId = requireUserId(context.user);
  const args = ensureArgsSchemaOrThrowHttpError(videoInputSchema, rawArgs);
  return queueVideo({ ...args, userId, requireFailed: false, context });
};

export const retryAiAnimationVideo: RetryAiAnimationVideo<
  z.infer<typeof videoInputSchema>,
  AnimationView
> = async (rawArgs, context) => {
  const userId = requireUserId(context.user);
  const args = ensureArgsSchemaOrThrowHttpError(videoInputSchema, rawArgs);
  return queueVideo({ ...args, userId, requireFailed: true, context });
};

async function queueVideo(input: {
  animationId: string;
  format: "mp4" | "webm";
  idempotencyKey: string;
  userId: string;
  requireFailed: boolean;
  context: {
    entities: {
      AiAnimation: PrismaClient["aiAnimation"];
    };
  };
}): Promise<AnimationView> {
  const animation = await input.context.entities.AiAnimation.findFirst({
    where: { id: input.animationId, userId: input.userId },
  });
  if (!animation) throw new HttpError(404, "Animation not found");
  if (animation.status !== "READY") {
    throw new HttpError(409, "Only ready animations can be rendered");
  }
  if (input.requireFailed && animation.videoStatus !== "FAILED") {
    throw new HttpError(409, "Only failed video jobs can be retried");
  }
  if (!input.requireFailed && animation.videoStatus === "SUCCEEDED") {
    return toAnimationView(animation);
  }

  const operation = input.requireFailed ? "VIDEO_RETRY" : "VIDEO_RENDER";
  const reservation = await reserveUsage({
    userId: input.userId,
    operation,
    idempotencyKey: input.idempotencyKey,
  });
  if (reservation.kind === "existing") {
    if (reservation.usage.animationId) {
      const replayed = await input.context.entities.AiAnimation.findFirst({
        where: { id: reservation.usage.animationId, userId: input.userId },
      });
      if (replayed) return toAnimationView(replayed);
    }
    throwExistingReservation(reservation);
  }
  ensureReserved(reservation);

  const allowedStatuses = input.requireFailed
    ? (["FAILED"] as const)
    : (["NOT_REQUESTED", "FAILED"] as const);
  const claimed = await input.context.entities.AiAnimation.updateMany({
    where: {
      id: input.animationId,
      userId: input.userId,
      videoStatus: { in: [...allowedStatuses] },
    },
    data: {
      videoStatus: "QUEUED",
      videoFormat: input.format,
      videoError: null,
      videoAttempts: 0,
      videoJobId: null,
      videoUsageLogId: reservation.usageLogId,
      videoUpdatedAt: new Date(),
      videoLeaseExpiresAt: null,
    },
  });
  if (claimed.count === 0) {
    await failUsage({
      usageLogId: reservation.usageLogId,
      windowStart: reservation.windowStart,
      userId: input.userId,
      reservedTokens: reservation.reservedTokens,
      errorCode: "VIDEO_STATE_CONFLICT",
      animationId: input.animationId,
    });
    throw new HttpError(409, "Video job is already queued or processing");
  }

  let submitted: Awaited<ReturnType<typeof videoJob.submit>>;
  try {
    submitted = await videoJob.submit(
      {
        animationId: input.animationId,
        userId: input.userId,
        format: input.format,
        usageLogId: reservation.usageLogId,
        windowStart: reservation.windowStart.toISOString(),
        reservedTokens: reservation.reservedTokens,
      },
      { retryLimit: 2 },
    );
  } catch {
    await input.context.entities.AiAnimation.updateMany({
      where: {
        id: input.animationId,
        userId: input.userId,
        videoStatus: "QUEUED",
      },
      data: {
        videoStatus: "FAILED",
        videoError: "Could not enqueue the video renderer",
        videoUpdatedAt: new Date(),
      },
    });
    await failUsage({
      usageLogId: reservation.usageLogId,
      windowStart: reservation.windowStart,
      userId: input.userId,
      reservedTokens: reservation.reservedTokens,
      errorCode: "VIDEO_QUEUE_FAILED",
      animationId: input.animationId,
    });
    throw new HttpError(503, "Could not enqueue the video renderer");
  }

  await input.context.entities.AiAnimation.updateMany({
    where: {
      id: input.animationId,
      userId: input.userId,
      videoUsageLogId: reservation.usageLogId,
    },
    data: { videoJobId: submitted.jobId },
  }).catch(() => undefined);
  const queued = await input.context.entities.AiAnimation.findFirst({
    where: { id: input.animationId, userId: input.userId },
  });
  if (!queued) throw new HttpError(404, "Animation not found");
  return toAnimationView(queued);
}

export const getAiStudioDashboard: GetAiStudioDashboard<
  void,
  AiStudioDashboard
> = async (_args, context) => {
  const userId = requireUserId(context.user);
  const windowStart = startOfUtcHour(new Date());
  await context.entities.AiAnimation.updateMany({
    where: {
      userId,
      videoStatus: "PROCESSING",
      videoLeaseExpiresAt: { lte: new Date() },
    },
    data: {
      videoStatus: "FAILED",
      videoError: "Video worker lease expired; retry is available.",
      videoUpdatedAt: new Date(),
      videoLeaseExpiresAt: null,
    },
  });

  const [animations, logs, quota, totals] = await prisma.$transaction([
    context.entities.AiAnimation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    context.entities.AiUsageLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        createdAt: true,
        operation: true,
        status: true,
        totalTokens: true,
        estimatedCostMicros: true,
        latencyMs: true,
        errorCode: true,
      },
    }),
    context.entities.AiQuotaWindow.findUnique({
      where: {
        userId_operation_windowStart: {
          userId,
          operation: sharedQuotaOperation(),
          windowStart,
        },
      },
      select: { requestCount: true, inFlight: true, tokenCount: true },
    }),
    context.entities.AiUsageLog.aggregate({
      where: { userId, status: "SUCCEEDED" },
      _sum: { totalTokens: true, estimatedCostMicros: true },
    }),
  ]);

  const usedThisHour = quota?.requestCount ?? 0;
  return {
    animations: animations.map(toAnimationView),
    usage: {
      hourlyLimit: AI_HOURLY_REQUEST_LIMIT,
      hourlyTokenLimit: AI_HOURLY_TOKEN_LIMIT,
      usedThisHour,
      tokensUsedThisHour: quota?.tokenCount ?? 0,
      inFlight: quota?.inFlight ?? 0,
      remainingThisHour: quotaRemaining(usedThisHour, AI_HOURLY_REQUEST_LIMIT),
      totalTokens: totals._sum.totalTokens ?? 0,
      estimatedCostMicros: totals._sum.estimatedCostMicros ?? 0,
    },
    logs,
  };
};

function requireUserId(user: { id: string } | undefined): string {
  if (!user) throw new HttpError(401, "Authentication required");
  return user.id;
}

function replayJsonOrThrow<T>(
  reservation: Reservation,
  schema: z.ZodType<T>,
): T | undefined {
  if (reservation.kind === "denied") {
    throw new HttpError(429, quotaDenialMessage(reservation.reason));
  }
  if (reservation.kind === "reserved") return undefined;
  if (reservation.usage.status === "SUCCEEDED") {
    return schema.parse(reservation.usage.responseJson);
  }
  throwExistingReservation(reservation);
}

function ensureReserved(
  reservation: Reservation,
): asserts reservation is Extract<Reservation, { kind: "reserved" }> {
  if (reservation.kind === "denied") {
    throw new HttpError(429, quotaDenialMessage(reservation.reason));
  }
  if (reservation.kind === "existing") throwExistingReservation(reservation);
}

function quotaDenialMessage(
  reason: Extract<Reservation, { kind: "denied" }>["reason"],
): string {
  if (reason === "RATE_LIMIT") return "Hourly AI request quota exhausted";
  if (reason === "TOKEN_LIMIT") return "Hourly AI token budget exhausted";
  return "Too many AI operations are already running";
}

function throwExistingReservation(
  reservation: Extract<Reservation, { kind: "existing" }>,
): never {
  if (reservation.usage.status === "STARTED") {
    throw new HttpError(409, "This request is already processing");
  }
  if (reservation.usage.status === "BLOCKED") {
    throw new HttpError(429, "This request was blocked by the AI usage policy");
  }
  throw new HttpError(409, "This idempotent request has already failed");
}

function enforceScoreInvariant(value: {
  originalScore: PromptScore;
  score: PromptScore;
}): void {
  enforceSingleScoreInvariant(value.originalScore);
  enforceSingleScoreInvariant(value.score);
}

function enforceSingleScoreInvariant(score: PromptScore): void {
  const total =
    score.clarity +
    score.specificity +
    score.motionDirection +
    score.feasibility;
  if (score.score !== total) {
    throw new Error("AI score categories do not add up to the total score");
  }
}

function errorCode(error: unknown): string {
  if (error instanceof z.ZodError) return "INVALID_AI_RESPONSE";
  if (error instanceof Error && error.message.includes("score categories")) {
    return "INVALID_AI_SCORE";
  }
  return "AI_PROVIDER_ERROR";
}

function toProviderHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  if (error instanceof z.ZodError) {
    return new HttpError(
      502,
      "AI provider returned an invalid structured result",
    );
  }
  return new HttpError(502, "AI provider request failed");
}

export function toAnimationView(animation: AiAnimation): AnimationView {
  return {
    id: animation.id,
    createdAt: animation.createdAt,
    updatedAt: animation.updatedAt,
    title: animation.title,
    description: animation.description,
    originalPrompt: animation.originalPrompt,
    optimizedPrompt: animation.optimizedPrompt,
    promptScore: animation.promptScore,
    promptFeedback: promptFeedbackSchema.parse(animation.promptFeedback),
    html: animation.html,
    durationSeconds: animation.durationSeconds,
    status: animation.status,
    generationError: animation.generationError,
    videoStatus: animation.videoStatus,
    videoFormat: animation.videoFormat,
    videoMimeType: animation.videoMimeType,
    videoError: animation.videoError,
    videoAttempts: animation.videoAttempts,
    videoDownloadPath:
      animation.videoStatus === "SUCCEEDED" && animation.videoStoragePath
        ? `/ai-studio/videos/${animation.id}`
        : null,
  };
}
