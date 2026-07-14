import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VIDEO_JOB_LEASE_MS, VIDEO_USAGE_RESERVATION_MS } from "./policy";

const mocks = vi.hoisted(() => ({
  completeUsage: vi.fn(),
  failUsage: vi.fn(),
  renderAnimationVideo: vi.fn(),
  discardRenderedVideo: vi.fn(),
}));

vi.mock("./server/usage", () => ({
  completeUsage: mocks.completeUsage,
  failUsage: mocks.failUsage,
}));

vi.mock("./server/videoRenderer", () => ({
  renderAnimationVideo: mocks.renderAnimationVideo,
  discardRenderedVideo: mocks.discardRenderedVideo,
}));

import { renderAiAnimationVideoJob } from "./server/videoJob";

const now = new Date("2026-07-14T08:00:00.000Z");
const jobArgs = {
  animationId: "animation-1",
  userId: "user-1",
  format: "mp4" as const,
  usageLogId: "usage-1",
  windowStart: "2026-07-14T08:00:00.000Z",
  reservedTokens: 1_000,
};
const animation = {
  id: jobArgs.animationId,
  userId: jobArgs.userId,
  videoUsageLogId: jobArgs.usageLogId,
  videoStatus: "QUEUED",
  videoAttempts: 1,
  html: "<div>animation</div>",
  durationSeconds: 5,
};

type JobContext = {
  entities: {
    AiAnimation: {
      findFirst: ReturnType<typeof vi.fn>;
      findFirstOrThrow: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    AiUsageLog: {
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
};

const runJob = renderAiAnimationVideoJob as unknown as (
  args: typeof jobArgs,
  context: JobContext,
) => Promise<void>;

function createContext(finalTransitionCount: number, attempts = 1) {
  const updateMany = vi
    .fn()
    .mockResolvedValueOnce({ count: 1 })
    .mockResolvedValueOnce({ count: finalTransitionCount });
  return {
    updateMany,
    context: {
      entities: {
        AiAnimation: {
          findFirst: vi.fn().mockResolvedValue(animation),
          findFirstOrThrow: vi
            .fn()
            .mockResolvedValue({ ...animation, videoAttempts: attempts }),
          updateMany,
        },
        AiUsageLog: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      },
    } satisfies JobContext,
  };
}

describe("video worker lease ownership", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.clearAllMocks();
    mocks.renderAnimationVideo.mockResolvedValue({
      storagePath: "/managed/usage-1.mp4",
      mimeType: "video/mp4",
    });
    mocks.discardRenderedVideo.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses a long lease and extends the video usage reservation", async () => {
    const fixture = createContext(1);

    await runJob(jobArgs, fixture.context);

    expect(VIDEO_JOB_LEASE_MS).toBeGreaterThanOrEqual(10 * 60_000);
    expect(VIDEO_USAGE_RESERVATION_MS).toBeGreaterThan(VIDEO_JOB_LEASE_MS);
    const claim = fixture.updateMany.mock.calls[0]?.[0];
    const leaseExpiresAt = claim.data.videoLeaseExpiresAt as Date;
    expect(leaseExpiresAt.getTime() - now.getTime()).toBe(VIDEO_JOB_LEASE_MS);

    const usageExtension =
      fixture.context.entities.AiUsageLog.updateMany.mock.calls[0]?.[0];
    expect(usageExtension.where).toMatchObject({
      id: jobArgs.usageLogId,
      userId: jobArgs.userId,
      status: "STARTED",
    });
    expect(
      (usageExtension.data.expiresAt as Date).getTime() - now.getTime(),
    ).toBe(VIDEO_USAGE_RESERVATION_MS);
  });

  it("discards output when an old worker no longer owns the lease", async () => {
    const fixture = createContext(0);

    await runJob(jobArgs, fixture.context);

    const claim = fixture.updateMany.mock.calls[0]?.[0];
    const leaseExpiresAt = claim.data.videoLeaseExpiresAt as Date;
    const completion = fixture.updateMany.mock.calls[1]?.[0];
    expect(completion.where).toMatchObject({
      id: jobArgs.animationId,
      userId: jobArgs.userId,
      videoStatus: "PROCESSING",
      videoUsageLogId: jobArgs.usageLogId,
      videoLeaseExpiresAt: { equals: leaseExpiresAt },
    });
    expect(mocks.renderAnimationVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        renderAttemptId: `${jobArgs.usageLogId}-${leaseExpiresAt.getTime()}`,
      }),
    );
    expect(mocks.discardRenderedVideo).toHaveBeenCalledWith(
      "/managed/usage-1.mp4",
    );
    expect(mocks.failUsage).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "VIDEO_JOB_SUPERSEDED" }),
    );
    expect(mocks.completeUsage).not.toHaveBeenCalled();
  });

  it("settles a successful render only after the owned transition wins", async () => {
    const fixture = createContext(1);

    await runJob(jobArgs, fixture.context);

    expect(mocks.discardRenderedVideo).not.toHaveBeenCalled();
    expect(mocks.failUsage).not.toHaveBeenCalled();
    expect(mocks.completeUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        usageLogId: jobArgs.usageLogId,
        animationId: jobArgs.animationId,
      }),
    );
  });

  it("guards the terminal failure transition with the same lease token", async () => {
    const fixture = createContext(1, 3);
    mocks.renderAnimationVideo.mockRejectedValue(new Error("ffmpeg failed"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await runJob(jobArgs, fixture.context);

    const claim = fixture.updateMany.mock.calls[0]?.[0];
    const leaseExpiresAt = claim.data.videoLeaseExpiresAt as Date;
    const failure = fixture.updateMany.mock.calls[1]?.[0];
    expect(failure.where).toMatchObject({
      videoStatus: "PROCESSING",
      videoUsageLogId: jobArgs.usageLogId,
      videoLeaseExpiresAt: { equals: leaseExpiresAt },
    });
    expect(failure.data.videoStatus).toBe("FAILED");
    expect(mocks.failUsage).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "VIDEO_RENDER_FAILED" }),
    );
    errorSpy.mockRestore();
  });
});
