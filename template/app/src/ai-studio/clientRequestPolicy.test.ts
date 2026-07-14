import { describe, expect, it, vi } from "vitest";
import {
  getOrCreateRequestKey,
  isRetryableTransportFailure,
  releaseAction,
  requestFingerprint,
  settleRequestKey,
  tryAcquireAction,
} from "./clientRequestPolicy";

describe("AI Studio client request coordination", () => {
  it("rejects a second synchronous action before React can re-render", () => {
    const lock = { current: null as string | null };
    expect(tryAcquireAction(lock, "optimize")).toBe(true);
    expect(tryAcquireAction(lock, "optimize")).toBe(false);
    releaseAction(lock, "optimize");
    expect(tryAcquireAction(lock, "generate")).toBe(true);
  });

  it("reuses one key after transport failure and rotates after settlement", () => {
    const cache = new Map<string, string>();
    const createId = vi
      .fn<() => string>()
      .mockReturnValueOnce("first")
      .mockReturnValueOnce("second");
    const fingerprint = requestFingerprint("generate", ["optimization-1"]);

    const first = getOrCreateRequestKey(
      cache,
      fingerprint,
      "generate",
      createId,
    );
    settleRequestKey(cache, fingerprint, "transport-failure");
    const replay = getOrCreateRequestKey(
      cache,
      fingerprint,
      "generate",
      createId,
    );
    expect(replay).toBe(first);
    expect(createId).toHaveBeenCalledTimes(1);

    settleRequestKey(cache, fingerprint, "completed");
    expect(
      getOrCreateRequestKey(cache, fingerprint, "generate", createId),
    ).toBe("generate:second");
  });

  it("only treats ambiguous transport errors as replayable", () => {
    expect(isRetryableTransportFailure(new TypeError("Failed to fetch"))).toBe(
      true,
    );
    expect(isRetryableTransportFailure(new Error("Network timeout"))).toBe(
      true,
    );
    expect(isRetryableTransportFailure(new Error("Quota exhausted"))).toBe(
      false,
    );
  });
});
