import { describe, expect, it } from "vitest";
import { isPublicNetworkAddress } from "./providerNetworkPolicy";
import {
  AiProviderNetworkError,
  createSafeProviderFetch,
} from "./server/providerNetworkSecurity";

describe("AI provider network policy", () => {
  it("allows public IP addresses and rejects private or special ranges", () => {
    expect(isPublicNetworkAddress("8.8.8.8")).toBe(true);
    expect(isPublicNetworkAddress("2606:4700:4700::1111")).toBe(true);

    for (const address of [
      "127.0.0.1",
      "10.0.0.8",
      "169.254.169.254",
      "192.168.1.10",
      "203.0.113.4",
      "::1",
      "fc00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
    ]) {
      expect(isPublicNetworkAddress(address)).toBe(false);
    }
  });

  it("blocks private DNS results before sending a credentialed request", async () => {
    let fetchCalls = 0;
    const safeFetch = createSafeProviderFetch("https://provider.example/v1", {
      resolveAddresses: async () => ["10.0.0.8"],
      fetch: async () => {
        fetchCalls += 1;
        return new Response();
      },
    });

    await expect(
      safeFetch("https://provider.example/v1/models/model-name", {
        headers: { authorization: "Bearer secret" },
      }),
    ).rejects.toBeInstanceOf(AiProviderNetworkError);
    expect(fetchCalls).toBe(0);
  });

  it("uses manual redirect handling and refuses redirect responses", async () => {
    let redirectMode: RequestRedirect | undefined;
    let fetchCalls = 0;
    const safeFetch = createSafeProviderFetch("https://provider.example/v1", {
      resolveAddresses: async () => ["8.8.8.8"],
      fetch: async (_input, init) => {
        fetchCalls += 1;
        redirectMode = init?.redirect;
        return new Response(null, {
          status: 307,
          headers: { location: "https://attacker.example/collect" },
        });
      },
    });

    await expect(
      safeFetch("https://provider.example/v1/models/model-name", {
        headers: { authorization: "Bearer secret" },
      }),
    ).rejects.toThrow("redirects are not allowed");
    expect(fetchCalls).toBe(1);
    expect(redirectMode).toBe("manual");
  });

  it("does not allow the SDK request to escape the configured origin", async () => {
    const safeFetch = createSafeProviderFetch("https://provider.example/v1", {
      resolveAddresses: async () => ["8.8.8.8"],
      fetch: async () => new Response(),
    });

    await expect(
      safeFetch("https://attacker.example/models/model-name"),
    ).rejects.toThrow("does not match the configured endpoint");
  });
});
