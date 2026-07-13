import { Prisma } from "@prisma/client";
import { prisma } from "wasp/server";
import {
  AI_HOURLY_REQUEST_LIMIT,
  AI_HOURLY_TOKEN_LIMIT,
  AI_MAX_CONCURRENT_REQUESTS,
  calculateEstimatedCostMicros,
  normalizeIdempotencyKey,
  startOfUtcHour,
} from "../policy";

const SHARED_QUOTA_OPERATION = "AI_STUDIO";
const TOKEN_RESERVATION_BY_OPERATION: Record<string, number> = {
  PROMPT_OPTIMIZE: 6_000,
  HTML_GENERATE: 18_000,
  VIDEO_RENDER: 0,
  VIDEO_RETRY: 0,
};

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
    now?: Date;
  },
  attempt = 0,
): Promise<Reservation> {
  const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
  const now = input.now ?? new Date();
  const windowStart = startOfUtcHour(now);
  const reservedTokens = TOKEN_RESERVATION_BY_OPERATION[input.operation] ?? 0;

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
            await releaseWindow(
              tx,
              input.userId,
              stale.quotaWindowStart,
              stale.reservedTokens,
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

        const capacity = await tx.aiQuotaWindow.updateMany({
          where: {
            id: window.id,
            requestCount: { lt: AI_HOURLY_REQUEST_LIMIT },
            inFlight: { lt: AI_MAX_CONCURRENT_REQUESTS },
            tokenCount: {
              lte: Math.max(0, AI_HOURLY_TOKEN_LIMIT - reservedTokens),
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
            expiresAt: new Date(now.getTime() + 5 * 60_000),
          },
          select: { id: true },
        });

        return {
          kind: "reserved",
          usageLogId: usage.id,
          windowStart,
          reservedTokens,
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
      if (error.code === "P2034" && attempt < 2) {
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
      await releaseWindow(
        tx,
        input.userId,
        input.windowStart,
        Math.max(0, input.reservedTokens - totalTokens),
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
}): Promise<void> {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const changed = await tx.aiUsageLog.updateMany({
      where: { id: input.usageLogId, status: "STARTED" },
      data: {
        status: "FAILED",
        errorCode: input.errorCode,
        latencyMs: input.latencyMs,
        animationId: input.animationId,
        expiresAt: null,
      },
    });
    if (changed.count > 0) {
      await releaseWindow(
        tx,
        input.userId,
        input.windowStart,
        input.reservedTokens,
      );
    }
  });
}

async function releaseWindow(
  tx: Prisma.TransactionClient,
  userId: string,
  windowStart: Date,
  tokenRefund: number,
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
      tokenCount: { decrement: tokenRefund },
    },
  });
}

export function sharedQuotaOperation(): string {
  return SHARED_QUOTA_OPERATION;
}
