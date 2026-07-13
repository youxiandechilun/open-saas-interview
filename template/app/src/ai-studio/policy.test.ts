import { describe, expect, it } from "vitest";
import {
  calculateEstimatedCostMicros,
  canReserveCapacity,
  isValidIdempotencyKey,
  normalizeIdempotencyKey,
  quotaRemaining,
  startOfUtcHour,
} from "./policy";

describe("AI capacity policy", () => {
  it("normalizes a quota window to the UTC hour", () => {
    expect(startOfUtcHour(new Date("2026-07-13T08:42:19.123Z"))).toEqual(
      new Date("2026-07-13T08:00:00.000Z"),
    );
  });

  it("blocks both request exhaustion and concurrent bypass", () => {
    expect(canReserveCapacity({ requestCount: 19, inFlight: 1 })).toBe(true);
    expect(canReserveCapacity({ requestCount: 20, inFlight: 0 })).toBe(false);
    expect(canReserveCapacity({ requestCount: 0, inFlight: 2 })).toBe(false);
  });

  it("never reports negative remaining requests", () => {
    expect(quotaRemaining(24, 20)).toBe(0);
  });

  it("accepts stable client request keys and rejects weak keys", () => {
    expect(normalizeIdempotencyKey(" Request-ABC_123 ")).toBe(
      "request-abc_123",
    );
    expect(isValidIdempotencyKey("request-abc_123")).toBe(true);
    expect(isValidIdempotencyKey("short")).toBe(false);
  });

  it("calculates a deterministic integer cost estimate", () => {
    expect(
      calculateEstimatedCostMicros({
        promptTokens: 1000,
        completionTokens: 500,
      }),
    ).toBe(450);
  });
});
