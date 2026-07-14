import { randomUUID } from "node:crypto";
import { prisma } from "wasp/server";

export const PROVIDER_CONNECTION_TEST_OPERATION = "AI_PROVIDER_CONNECTION_TEST";
export const PROVIDER_CONNECTION_TEST_COOLDOWN_MS = 30_000;

export type ProviderConnectionTestReservation =
  | { allowed: true; auditId: string; startedAt: Date }
  | { allowed: false; retryAfterMs: number };

export async function reserveProviderConnectionTest(input: {
  userId: string;
  now?: Date;
}): Promise<ProviderConnectionTestReservation> {
  return prisma.$transaction(async (tx) => {
    // The transaction-scoped lock serializes concurrent tests from one admin.
    // A rolling-window query then enforces a true 30-second cooldown.
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtext(${PROVIDER_CONNECTION_TEST_OPERATION}),
        hashtext(${input.userId})
      )
    `;

    const now = input.now ?? new Date();
    const recent = await tx.aiUsageLog.findFirst({
      where: {
        userId: input.userId,
        operation: PROVIDER_CONNECTION_TEST_OPERATION,
        createdAt: {
          gt: new Date(now.getTime() - PROVIDER_CONNECTION_TEST_COOLDOWN_MS),
        },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (recent) {
      return {
        allowed: false,
        retryAfterMs: providerConnectionTestRetryAfterMs(recent.createdAt, now),
      };
    }

    const audit = await tx.aiUsageLog.create({
      data: {
        userId: input.userId,
        operation: PROVIDER_CONNECTION_TEST_OPERATION,
        idempotencyKey: randomUUID(),
        status: "STARTED",
        createdAt: now,
        expiresAt: new Date(
          now.getTime() + PROVIDER_CONNECTION_TEST_COOLDOWN_MS,
        ),
      },
      select: { id: true, createdAt: true },
    });
    return { allowed: true, auditId: audit.id, startedAt: audit.createdAt };
  });
}

export async function completeProviderConnectionTest(input: {
  auditId: string;
  latencyMs: number;
  model: string;
  configFingerprint: string;
}): Promise<void> {
  await prisma.aiUsageLog.updateMany({
    where: { id: input.auditId, status: "STARTED" },
    data: {
      status: "SUCCEEDED",
      latencyMs: input.latencyMs,
      responseJson: {
        model: input.model,
        configFingerprint: input.configFingerprint,
      },
      expiresAt: null,
    },
  });
}

export async function failProviderConnectionTest(input: {
  auditId: string;
  latencyMs: number;
  errorCode: string;
}): Promise<void> {
  await prisma.aiUsageLog.updateMany({
    where: { id: input.auditId, status: "STARTED" },
    data: {
      status: "FAILED",
      latencyMs: input.latencyMs,
      errorCode: input.errorCode,
      expiresAt: null,
    },
  });
}

export function providerConnectionTestRetryAfterMs(
  lastTestAt: Date,
  now: Date,
): number {
  return Math.max(
    0,
    PROVIDER_CONNECTION_TEST_COOLDOWN_MS -
      (now.getTime() - lastTestAt.getTime()),
  );
}
