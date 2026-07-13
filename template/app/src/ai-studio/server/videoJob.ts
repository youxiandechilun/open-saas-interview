import type { RenderAiAnimationVideoJob } from "wasp/server/jobs";
import { VIDEO_MAX_ATTEMPTS } from "../policy";
import { completeUsage, failUsage } from "./usage";
import { renderAnimationVideo, type VideoFormat } from "./videoRenderer";

type RenderVideoJobInput = {
  animationId: string;
  userId: string;
  format: VideoFormat;
  usageLogId: string;
  windowStart: string;
  reservedTokens: number;
};

export const renderAiAnimationVideoJob: RenderAiAnimationVideoJob<
  RenderVideoJobInput,
  void
> = async (args, context) => {
  const windowStart = new Date(args.windowStart);
  const startedAt = Date.now();
  const animation = await context.entities.AiAnimation.findFirst({
    where: { id: args.animationId, userId: args.userId },
  });

  if (!animation) {
    await failUsage({
      usageLogId: args.usageLogId,
      windowStart,
      userId: args.userId,
      reservedTokens: args.reservedTokens,
      errorCode: "VIDEO_ANIMATION_NOT_FOUND",
    });
    return;
  }
  if (animation.videoUsageLogId !== args.usageLogId) {
    await failUsage({
      usageLogId: args.usageLogId,
      windowStart,
      userId: args.userId,
      reservedTokens: args.reservedTokens,
      errorCode: "VIDEO_JOB_SUPERSEDED",
      animationId: animation.id,
    });
    return;
  }
  if (animation.videoStatus === "SUCCEEDED") {
    await completeUsage({
      usageLogId: args.usageLogId,
      windowStart,
      userId: args.userId,
      reservedTokens: args.reservedTokens,
      animationId: animation.id,
      latencyMs: Date.now() - startedAt,
      responseJson: { animationId: animation.id },
    });
    return;
  }

  const claimed = await context.entities.AiAnimation.updateMany({
    where: {
      id: args.animationId,
      userId: args.userId,
      videoUsageLogId: args.usageLogId,
      videoAttempts: { lt: VIDEO_MAX_ATTEMPTS },
      OR: [
        { videoStatus: "QUEUED" },
        { videoStatus: "FAILED" },
        {
          videoStatus: "PROCESSING",
          videoLeaseExpiresAt: { lte: new Date() },
        },
      ],
    },
    data: {
      videoStatus: "PROCESSING",
      videoAttempts: { increment: 1 },
      videoError: null,
      videoUpdatedAt: new Date(),
      videoLeaseExpiresAt: new Date(Date.now() + 2 * 60_000),
    },
  });
  if (claimed.count === 0) {
    const current = await context.entities.AiAnimation.findFirst({
      where: { id: args.animationId, userId: args.userId },
    });
    if (current?.videoStatus === "SUCCEEDED") {
      await completeUsage({
        usageLogId: args.usageLogId,
        windowStart,
        userId: args.userId,
        reservedTokens: args.reservedTokens,
        animationId: args.animationId,
        responseJson: { animationId: args.animationId },
      });
      return;
    }
    if ((current?.videoAttempts ?? VIDEO_MAX_ATTEMPTS) >= VIDEO_MAX_ATTEMPTS) {
      await failUsage({
        usageLogId: args.usageLogId,
        windowStart,
        userId: args.userId,
        reservedTokens: args.reservedTokens,
        errorCode: "VIDEO_RETRY_LIMIT",
        animationId: args.animationId,
      });
      return;
    }
    throw new Error("Video job could not claim the queued animation");
  }

  const active = await context.entities.AiAnimation.findFirstOrThrow({
    where: { id: args.animationId, userId: args.userId },
  });
  try {
    const rendered = await renderAnimationVideo({
      html: active.html,
      durationSeconds: active.durationSeconds,
      format: args.format,
      userId: args.userId,
      animationId: args.animationId,
    });
    await context.entities.AiAnimation.update({
      where: { id: args.animationId, userId: args.userId },
      data: {
        videoStatus: "SUCCEEDED",
        videoStoragePath: rendered.storagePath,
        videoMimeType: rendered.mimeType,
        videoError: null,
        videoUpdatedAt: new Date(),
        videoLeaseExpiresAt: null,
      },
    });
    await completeUsage({
      usageLogId: args.usageLogId,
      windowStart,
      userId: args.userId,
      reservedTokens: args.reservedTokens,
      animationId: args.animationId,
      latencyMs: Date.now() - startedAt,
      responseJson: { animationId: args.animationId },
    });
  } catch (error) {
    console.error(
      `Video rendering failed for animation ${args.animationId}`,
      error,
    );
    const message =
      error instanceof Error &&
      error.message.toLowerCase().includes("timed out")
        ? "Video rendering timed out"
        : "Video rendering failed";
    const shouldRetry = active.videoAttempts < VIDEO_MAX_ATTEMPTS;
    await context.entities.AiAnimation.updateMany({
      where: {
        id: args.animationId,
        userId: args.userId,
        videoStatus: "PROCESSING",
        videoUsageLogId: args.usageLogId,
      },
      data: {
        videoStatus: shouldRetry ? "QUEUED" : "FAILED",
        videoError: message,
        videoUpdatedAt: new Date(),
        videoLeaseExpiresAt: null,
      },
    });
    if (!shouldRetry) {
      await failUsage({
        usageLogId: args.usageLogId,
        windowStart,
        userId: args.userId,
        reservedTokens: args.reservedTokens,
        errorCode: "VIDEO_RENDER_FAILED",
        animationId: args.animationId,
        latencyMs: Date.now() - startedAt,
      });
    }
    throw error;
  }
};
