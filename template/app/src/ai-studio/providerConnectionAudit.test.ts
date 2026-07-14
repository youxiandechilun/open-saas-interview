import { describe, expect, it } from "vitest";
import {
  PROVIDER_CONNECTION_TEST_COOLDOWN_MS,
  providerConnectionTestRetryAfterMs,
} from "./server/providerConnectionAudit";
import { createProviderConfigFingerprint } from "./server/providerFingerprint";

describe("AI provider connection-test cooldown", () => {
  it("uses a rolling 30-second window", () => {
    const firstTest = new Date("2026-07-13T00:00:00.000Z");

    expect(
      providerConnectionTestRetryAfterMs(
        firstTest,
        new Date("2026-07-13T00:00:00.001Z"),
      ),
    ).toBe(PROVIDER_CONNECTION_TEST_COOLDOWN_MS - 1);
    expect(
      providerConnectionTestRetryAfterMs(
        firstTest,
        new Date("2026-07-13T00:00:30.000Z"),
      ),
    ).toBe(0);
  });
});

describe("AI provider connection fingerprint", () => {
  const config = {
    baseUrl: "https://api.example.com/v1",
    model: "model-a",
    apiKey: "secret-a",
  };

  it("is stable for the same effective provider and changes with credentials", () => {
    expect(createProviderConfigFingerprint(config)).toBe(
      createProviderConfigFingerprint({ ...config }),
    );
    expect(
      createProviderConfigFingerprint({ ...config, apiKey: "secret-b" }),
    ).not.toBe(createProviderConfigFingerprint(config));
    expect(
      createProviderConfigFingerprint({
        ...config,
        baseUrl: "https://other.example/v1",
      }),
    ).not.toBe(createProviderConfigFingerprint(config));
  });
});
