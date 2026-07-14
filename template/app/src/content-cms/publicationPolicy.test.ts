import { describe, expect, it } from "vitest";
import {
  CMS_PUBLICATION_DISABLED_MESSAGE,
  getPublicationInitialState,
  getPublicationWebhookConfig,
  isRetryablePublicationStatus,
} from "./publicationPolicy";

describe("publication integration state", () => {
  it("queues publication when a webhook is configured", () => {
    expect(
      getPublicationInitialState("https://example.com/rebuild", "secret-token"),
    ).toEqual({ status: "PENDING", lastError: null });
  });

  it.each([
    [undefined, undefined],
    ["https://example.com/rebuild", undefined],
    [undefined, "secret-token"],
    ["   ", "secret-token"],
    ["https://example.com/rebuild", "   "],
  ])("marks an incomplete configuration disabled", (url, token) => {
    expect(getPublicationInitialState(url, token)).toEqual({
      status: "DISABLED",
      lastError: CMS_PUBLICATION_DISABLED_MESSAGE,
    });
    expect(getPublicationWebhookConfig(url, token)).toBeNull();
  });

  it("returns a trimmed authenticated webhook configuration", () => {
    expect(
      getPublicationWebhookConfig(
        " https://example.com/rebuild ",
        " secret-token ",
      ),
    ).toEqual({ url: "https://example.com/rebuild", token: "secret-token" });
  });

  it("only retries failed or disabled publication events", () => {
    expect(isRetryablePublicationStatus("FAILED")).toBe(true);
    expect(isRetryablePublicationStatus("DISABLED")).toBe(true);
    expect(isRetryablePublicationStatus("PROCESSING")).toBe(false);
    expect(isRetryablePublicationStatus("PROCESSED")).toBe(false);
  });
});
