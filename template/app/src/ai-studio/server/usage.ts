import { Prisma } from "@prisma/client";
import { prisma } from "wasp/server";
import {
  AI_HOURLY_REQUEST_LIMIT,
  AI_MAX_CONCURRENT_REQUESTS,
  calculateEstimatedCostMicros,
  normalizeIdempotencyKey,
  startOfUtcHour,
} from "../policy";
import {
  AI_PROVIDER_CONFIG_ID,
  getAiProviderEnvironment,
} from "./providerConfig";
import { resolveAiProviderLimits } from "./providerResolution";
import {
  calculateTokenReservation,
  calculateTokenSettlementDelta,
  tokenCapacityThreshold,
} from "./quotaPolicy";

const SHARED_QUOTA_OPERATION = "AI_STUDIO";

type ExistingUsage = {
  id: string;
  status: string;
  responseJson: Prisma.JsonValue | null;
  animationId: string | null;
  errorCode: string | null;
};

export type Reservation =
  | {
      kind: "reserved";
      usageLogId: string;
      windowStart: Date;
      reservedTokens: number;
      maxCompletionTokens: number;
      hourlyTokenLimit: number;
    }
  | { kind: "existing"; usage: ExistingUsage }
  | {
      kind: "denied";
      reason: "RATE_LIMIT" | "CONCURRENCY_LIMIT" | "TOKEN_LIMIT";
    };

export async function reserveUsage(
  input: {
    userId: string;
    operation: string;
    idempotencyKey: string;
    estimatedPromptTokens?: number;
    requestedCompletionTokens?: number;
    reservationTtlMs?: number;
    now?: Date;
  },
  attempt = 0,
): Promise<Reservation> {
  const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
  const now = input.now ?? new Date();
  const windowStart = startOfUtcHour(now);

  try {
    return await prisma.$transaction(
      async (tx: Prisma.TransactionClient): Promise<Reservation> => {
        const staleReservations = await tx.aiUsageLog.findMany({
          where: {
            userId: input.userId,
            status: "STARTED",
            expiresAt: { lte: now },
            quotaWindowStart: { not: null },
          },
          select: {
            id: true,
            reservedTokens: true,
            quotaWindowStart: true,
          },
          take: 10,
        });
        for (const stale of staleReservations) {
          const expired = await tx.aiUsageLog.updateMany({
            where: { id: stale.id, status: "STARTED", expiresAt: { lte: now } },
            data: {
              status: "FAILED",
              errorCode: "RESERVATION_EXPIRED",
              expiresAt: null,
            },
          });
          if (expired.count > 0 && stale.quotaWindowStart) {
            await settleQuotaWindow(
              tx,
              input.userId,
              stale.quotaWindowStart,
              -stale.reservedTokens,
            );
          }
        }

        const existing = await tx.aiUsageLog.findUnique({
          where: {
            userId_operation_idempotencyKey: {
              userId: input.userId,
              operation: input.operation,
              idempotencyKey,
            },
          },
          select: {
            id: true,
            status: true,
            responseJson: true,
            animationId: true,
            errorCode: true,
          },
        });
        if (existing) return { kind: "existing", usage: existing };

        const storedLimits = await tx.aiProviderConfig.findUnique({
          where: { id: AI_PROVIDER_CONFIG_ID },
          select: {
            hourlyTokenLimit: true,
            maxCompletionTokens: true,
          },
        });
        const limits = resolveAiProviderLimits({
          stored: storedLimits,
          environment: getAiProviderEnvironment(),
        });
        const plan = calculateTokenReservation({
          estimatedPromptTokens: input.estimatedPromptTokens ?? 0,
          requestedCompletionTokens: input.requestedCompletionTokens ?? 0,
          configuredMaxCompletionTokens: limits.maxCompletionTokens,
        });
        const reservedTokens = plan.reservedTokens;

        const window = await tx.aiQuotaWindow.upsert({
          where: {
            userId_operation_windowStart: {
              userId: input.userId,
              operation: SHARED_QUOTA_OPERATION,
              windowStart,
            },
          },
          create: {
            userId: input.userId,
            operation: SHARED_QUOTA_OPERATION,
            windowStart,
          },
          update: {},
          select: {
            id: true,
            requestCount: true,
            inFlight: true,
            tokenCount: true,
          },
        });

        const tokenThreshold = tokenCapacityThreshold(
          limits.hourlyTokenLimit,
          reservedTokens,
        );
        if (tokenThreshold === null) {
          return { kind: "denied", reason: "TOKEN_LIMIT" };
        }

        const capacity = await tx.aiQuotaWindow.updateMany({
          where: {
            id: window.id,
            requestCount: { lt: AI_HOURLY_REQUEST_LIMIT },
            inFlight: { lt: AI_MAX_CONCURRENT_REQUESTS },
            tokenCount: {
              lte: tokenThreshold,
            },
          },
          data: {
            requestCount: { increment: 1 },
            inFlight: { increment: 1 },
            tokenCount: { increment: reservedTokens },
          },
        });

        if (capacity.count === 0) {
          const reason =
            window.requestCount >= AI_HOURLY_REQUEST_LIMIT
              ? "RATE_LIMIT"
              : window.inFlight >= AI_MAX_CONCURRENT_REQUESTS
                ? "CONCURRENCY_LIMIT"
                : "TOKEN_LIMIT";
          return { kind: "denied", reason };
        }

        const usage = await tx.aiUsageLog.create({
          data: {
            userId: input.userId,
            operation: input.operation,
            idempotencyKey,
            status: "STARTED",
            reservedTokens,
            quotaWindowStart: windowStart,
            expiresAt: new Date(
              now.getTime() + (input.reservationTtlMs ?? 5 * 60_000),
            ),
          },
          select: { id: true },
        });

        return {
          kind: "reserved",
          usageLogId: usage.id,
          windowStart,
          reservedTokens,
          maxCompletionTokens: plan.maxCompletionTokens,
          hourlyTokenLimit: limits.hourlyTokenLimit,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      const existing = await prisma.aiUsageLog.findUnique({
        where: {
          userId_operation_idempotencyKey: {
            userId: input.userId,
            operation: input.operation,
            idempotencyKey,
          },
        },
        select: {
          id: true,
          status: true,
          responseJson: true,
          animationId: true,
          errorCode: true,
        },
      });
      if (existing) return { kind: "existing", usage: existing };
      if (attempt < 2) {
        return reserveUsage(input, attempt + 1);
      }
    }
    throw error;
  }
}

export async function completeUsage(input: {
  usageLogId: string;
  windowStart: Date;
  userId: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  responseJson?: Prisma.InputJsonValue;
  animationId?: string;
  reservedTokens: number;
}): Promise<void> {
  const promptTokens = input.promptTokens ?? 0;
  const completionTokens = input.completionTokens ?? 0;
  const totalTokens = promptTokens + completionTokens;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const changed = await tx.aiUsageLog.updateMany({
      where: { id: input.usageLogId, status: "STARTED" },
      data: {
        status: "SUCCEEDED",
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostMicros: calculateEstimatedCostMicros({
          promptTokens,
          completionTokens,
        }),
        latencyMs: input.latencyMs,
        responseJson: input.responseJson,
        animationId: input.animationId,
        expiresAt: null,
      },
    });
    if (changed.count > 0) {
      await settleQuotaWindow(
        tx,
        input.userId,
        input.windowStart,
        calculateTokenSettlementDelta({
          reservedTokens: input.reservedTokens,
          promptTokens,
          completionTokens,
        }),
      );
    }
  });
}

export async function failUsage(input: {
  usageLogId: string;
  windowStart: Date;
  userId: string;
  errorCode: string;
  latencyMs?: number;
  animationId?: string;
  reservedTokens: number;
  promptTokens?: number;
  completionTokens?: number;
}): Promise<void> {
  const promptTokens = Math.max(0, Math.floor(input.promptTokens ?? 0));
  const completionTokens = Math.max(0, Math.floor(input.completionTokens ?? 0));
  const totalTokens = promptTokens + completionTokens;
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const changed = await tx.aiUsageLog.updateMany({
      where: { id: input.usageLogId, status: "STARTED" },
      data: {
        status: "FAILED",
        errorCode: input.errorCode,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostMicros: calculateEstimatedCostMicros({
          promptTokens,
          completionTokens,
        }),
        latencyMs: input.latencyMs,
        animationId: input.animationId,
        expiresAt: null,
      },
    });
    if (changed.count > 0) {
      await settleQuotaWindow(
        tx,
        input.userId,
        input.windowStart,
        calculateTokenSettlementDelta({
          reservedTokens: input.reservedTokens,
          promptTokens,
          completionTokens,
        }),
      );
    }
  });
}

export async function expireVideoLease(input: {
  animationId: string;
  userId: string;
  usageLogId: string | null;
  now: Date;
}): Promise<boolean> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const animationChanged = await tx.aiAnimation.updateMany({
      where: {
        id: input.animationId,
        userId: input.userId,
        videoStatus: "PROCESSING",
        videoUsageLogId: input.usageLogId,
        videoLeaseExpiresAt: { lte: input.now },
      },
      data: {
        videoStatus: "FAILED",
        videoError: "Video worker lease expired; retry is available.",
        videoUpdatedAt: input.now,
        videoLeaseExpiresAt: null,
      },
    });
    if (animationChanged.count === 0 || !input.usageLogId) return false;

    const usage = await tx.aiUsageLog.findUnique({
      where: { id: input.usageLogId },
      select: {
        status: true,
        quotaWindowStart: true,
        reservedTokens: true,
      },
    });
    if (!usage || usage.status !== "STARTED") return true;

    const usageChanged = await tx.aiUsageLog.updateMany({
      where: { id: input.usageLogId, status: "STARTED" },
      data: {
        status: "FAILED",
        errorCode: "VIDEO_LEASE_EXPIRED",
        animationId: input.animationId,
        expiresAt: null,
      },
    });
    if (usageChanged.count > 0 && usage.quotaWindowStart) {
      await settleQuotaWindow(
        tx,
        input.userId,
        usage.quotaWindowStart,
        -usage.reservedTokens,
      );
    }
    return true;
  });
}

async function settleQuotaWindow(
  tx: Prisma.TransactionClient,
  userId: string,
  windowStart: Date,
  tokenDelta: number,
): Promise<void> {
  await tx.aiQuotaWindow.updateMany({
    where: {
      userId,
      operation: SHARED_QUOTA_OPERATION,
      windowStart,
      inFlight: { gt: 0 },
    },
    data: {
      inFlight: { decrement: 1 },
      tokenCount:
        tokenDelta >= 0
          ? { increment: tokenDelta }
          : { decrement: Math.abs(tokenDelta) },
    },
  });
}

export function sharedQuotaOperation(): string {
  return SHARED_QUOTA_OPERATION;
}
