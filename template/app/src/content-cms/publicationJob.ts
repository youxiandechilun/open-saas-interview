import { env } from "wasp/server";
import { type DispatchCmsPublicationEventsJob } from "wasp/server/jobs";
import {
  CMS_PUBLICATION_DISABLED_MESSAGE,
  getPublicationWebhookConfig,
} from "./publicationPolicy";

const MAX_PUBLICATION_ATTEMPTS = 5;
const PUBLICATION_BATCH_SIZE = 20;

export const dispatchCmsPublicationEventsJob: DispatchCmsPublicationEventsJob<
  never,
  void
> = async (_args, context) => {
  const webhook = getPublicationWebhookConfig(
    env.CMS_REBUILD_WEBHOOK_URL,
    env.CMS_REBUILD_WEBHOOK_TOKEN,
  );
  if (!webhook) {
    await context.entities.CmsPublicationEvent.updateMany({
      where: { status: { in: ["PENDING", "PROCESSING"] } },
      data: {
        status: "DISABLED",
        lastError: CMS_PUBLICATION_DISABLED_MESSAGE,
      },
    });
    return;
  }

  const now = new Date();
  const staleBefore = new Date(now.getTime() - 5 * 60_000);
  await context.entities.CmsPublicationEvent.updateMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lt: staleBefore },
      attempts: { lt: MAX_PUBLICATION_ATTEMPTS },
    },
    data: { status: "PENDING", availableAt: now },
  });
  await context.entities.CmsPublicationEvent.updateMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lt: staleBefore },
      attempts: { gte: MAX_PUBLICATION_ATTEMPTS },
    },
    data: {
      status: "FAILED",
      lastError: "Publication claim expired after the final retry.",
    },
  });

  const events = await context.entities.CmsPublicationEvent.findMany({
    where: {
      status: "PENDING",
      attempts: { lt: MAX_PUBLICATION_ATTEMPTS },
      availableAt: { lte: now },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: PUBLICATION_BATCH_SIZE,
  });

  for (const event of events) {
    const claimed = await context.entities.CmsPublicationEvent.updateMany({
      where: { id: event.id, status: "PENDING", attempts: event.attempts },
      data: {
        status: "PROCESSING",
        attempts: { increment: 1 },
        lastError: null,
      },
    });
    if (claimed.count === 0) continue;

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": event.id,
          Authorization: `Bearer ${webhook.token}`,
        },
        body: JSON.stringify({
          eventId: event.id,
          eventType: event.eventType,
          contentVersion: event.contentVersion,
          payload: event.payload,
          createdAt: event.createdAt,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        throw new Error(`Rebuild webhook returned HTTP ${response.status}.`);
      }
      await context.entities.CmsPublicationEvent.update({
        where: { id: event.id },
        data: { status: "PROCESSED", processedAt: new Date(), lastError: null },
      });
    } catch (error) {
      const attempts = event.attempts + 1;
      const retryDelayMs = Math.min(2 ** attempts * 60_000, 60 * 60_000);
      await context.entities.CmsPublicationEvent.update({
        where: { id: event.id },
        data: {
          status: attempts >= MAX_PUBLICATION_ATTEMPTS ? "FAILED" : "PENDING",
          lastError: getErrorMessage(error),
          availableAt: new Date(Date.now() + retryDelayMs),
        },
      });
    }
  }
};

function getErrorMessage(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).slice(
    0,
    1_000,
  );
}
