import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { aiStudioEnvSchema } from "./env";
import {
  aiProviderSettingsInputSchema,
  buildEmailDeliveryIntegrationView,
  buildPublishingIntegrationView,
  hasSameCredentialOrigin,
} from "./providerSettings";
import { createAiProviderClient } from "./server/providerConfig";
import {
  AiProviderConfigError,
  createApiKeyHint,
  decryptApiKey,
  encryptApiKey,
  isValidMasterKey,
} from "./server/providerEncryption";
import {
  buildAiProviderSettingsView,
  normalizeEnvironmentApiKey,
  resolveEffectiveAiProviderConfig,
} from "./server/providerResolution";

const masterKey = randomBytes(32).toString("base64");

describe("AI provider credential encryption", () => {
  it("round-trips with AES-256-GCM without embedding the plaintext", () => {
    const apiKey = "test-provider-api-key-value";
    const encrypted = encryptApiKey(apiKey, masterKey);

    expect(encrypted).toMatch(/^v1\.[A-Za-z\d_-]+\.[A-Za-z\d_-]+\./);
    expect(encrypted).not.toContain(apiKey);
    expect(decryptApiKey(encrypted, masterKey)).toBe(apiKey);
  });

  it("rejects tampered ciphertext and the wrong master key", () => {
    const encrypted = encryptApiKey("test-provider-api-key-value", masterKey);
    const parts = encrypted.split(".");
    parts[3] = `${parts[3][0] === "A" ? "B" : "A"}${parts[3].slice(1)}`;

    expect(() => decryptApiKey(parts.join("."), masterKey)).toThrow(
      AiProviderConfigError,
    );
    expect(() =>
      decryptApiKey(encrypted, randomBytes(32).toString("base64")),
    ).toThrow(AiProviderConfigError);
  });

  it("exposes only a non-secret key hint", () => {
    const apiKey = "test-provider-api-key-value";
    const hint = createApiKeyHint(apiKey);

    expect(hint).toBe("****alue");
    expect(hint).not.toContain(apiKey);
    expect(createApiKeyHint("test-key")).toBe("****");
  });

  it("validates an exact 32-byte master key in the startup schema", () => {
    expect(isValidMasterKey(masterKey)).toBe(true);
    expect(isValidMasterKey(randomBytes(31).toString("base64"))).toBe(false);
    expect(
      aiStudioEnvSchema.safeParse({ AI_CONFIG_ENCRYPTION_KEY: masterKey })
        .success,
    ).toBe(true);
    expect(
      aiStudioEnvSchema.safeParse({
        AI_CONFIG_ENCRYPTION_KEY: randomBytes(31).toString("base64"),
      }).success,
    ).toBe(false);
  });

  it("allows first boot without credentials and validates explicit limits", () => {
    expect(aiStudioEnvSchema.safeParse({}).success).toBe(true);
    expect(
      aiStudioEnvSchema.safeParse({ AI_HOURLY_TOKEN_LIMIT: "999" }).success,
    ).toBe(false);
    expect(
      aiStudioEnvSchema.safeParse({
        AI_HOURLY_TOKEN_LIMIT: "42000",
        AI_MAX_COMPLETION_TOKENS: "4096",
      }).data,
    ).toMatchObject({
      AI_HOURLY_TOKEN_LIMIT: 42_000,
      AI_MAX_COMPLETION_TOKENS: 4_096,
    });
  });
});

describe("AI provider configuration resolution", () => {
  it("disables automatic SDK retries", () => {
    const client = createAiProviderClient({
      source: "environment",
      baseUrl: "https://provider.example/v1",
      model: "model-name",
      apiKey: "provider-secret",
      hourlyTokenLimit: 100_000,
      maxCompletionTokens: 12_000,
    });

    expect(client.maxRetries).toBe(0);
  });

  it("prefers and decrypts the database configuration", () => {
    const stored = {
      baseUrl: "https://db-provider.example/v1",
      model: "db-model",
      encryptedApiKey: encryptApiKey("database-secret", masterKey),
      apiKeyHint: "****cret",
      hourlyTokenLimit: 100_000,
      maxCompletionTokens: 12_000,
      updatedAt: new Date("2026-07-13T00:00:00.000Z"),
    };

    expect(
      resolveEffectiveAiProviderConfig({
        stored,
        encryptionKey: masterKey,
        environment: {
          apiKey: "environment-secret",
          baseUrl: "https://env-provider.example/v1",
          model: "env-model",
        },
      }),
    ).toEqual({
      source: "database",
      baseUrl: "https://db-provider.example/v1",
      model: "db-model",
      apiKey: "database-secret",
      hourlyTokenLimit: 100_000,
      maxCompletionTokens: 12_000,
    });
  });

  it("falls back to environment settings and keeps secrets out of the view", () => {
    const environment = {
      apiKey: "environment-secret",
      baseUrl: "https://env-provider.example/v1",
      model: "shared-model",
      studioModel: "studio-model",
    };
    const effective = resolveEffectiveAiProviderConfig({
      stored: null,
      environment,
    });
    const view = buildAiProviderSettingsView({ stored: null, environment });

    expect(effective).toEqual({
      source: "environment",
      baseUrl: "https://env-provider.example/v1",
      model: "studio-model",
      apiKey: "environment-secret",
      hourlyTokenLimit: 100_000,
      maxCompletionTokens: 12_000,
    });
    expect(view).toMatchObject({
      source: "environment",
      hasApiKey: true,
      apiKeyHint: "****cret",
    });
    expect("apiKey" in view).toBe(false);
  });

  it("normalizes safe URLs and rejects credential-bearing URLs", () => {
    expect(
      aiProviderSettingsInputSchema.parse({
        baseUrl: "https://provider.example/v1/",
        model: " model-name ",
        apiKey: "",
      }),
    ).toEqual({
      baseUrl: "https://provider.example/v1",
      model: "model-name",
      apiKey: undefined,
      hourlyTokenLimit: 100_000,
      maxCompletionTokens: 12_000,
    });
    expect(() =>
      aiProviderSettingsInputSchema.parse({
        baseUrl: "https://user:secret@provider.example/v1",
        model: "model-name",
      }),
    ).toThrow();
    for (const baseUrl of [
      "http://provider.example/v1",
      "https://localhost/v1",
      "https://127.0.0.1/v1",
      "https://10.0.0.8/v1",
      "https://[::1]/v1",
    ]) {
      expect(() =>
        aiProviderSettingsInputSchema.parse({
          baseUrl,
          model: "model-name",
        }),
      ).toThrow();
    }
  });

  it("treats documented API-key placeholders as unconfigured", () => {
    expect(normalizeEnvironmentApiKey(" sk-k... ")).toBeUndefined();
    expect(normalizeEnvironmentApiKey("sk-real-looking-key")).toBe(
      "sk-real-looking-key",
    );

    const environment = {
      apiKey: "sk-k...",
      baseUrl: "https://provider.example/v1",
      model: "model-name",
    };
    expect(
      buildAiProviderSettingsView({ stored: null, environment }),
    ).toMatchObject({ hasApiKey: false, apiKeyHint: null });
    expect(() =>
      resolveEffectiveAiProviderConfig({ stored: null, environment }),
    ).toThrow("AI provider API key is not configured");
  });

  it("only reuses a stored key for the same provider origin", () => {
    expect(
      hasSameCredentialOrigin(
        "https://provider.example/v1",
        "https://provider.example/openai/v1",
      ),
    ).toBe(true);
    expect(
      hasSameCredentialOrigin(
        "https://provider.example/v1",
        "https://attacker.example/v1",
      ),
    ).toBe(false);
  });
});

describe("publishing integration settings view", () => {
  it("returns configuration booleans without exposing webhook values", () => {
    const webhookUrl = "https://deploy.example/hooks/rebuild";
    const webhookToken = "a-server-only-token-that-must-not-leak";
    const view = buildPublishingIntegrationView({
      webhookUrl,
      webhookToken,
    });

    expect(view).toEqual({
      webhookUrlConfigured: true,
      webhookTokenConfigured: true,
      ready: true,
    });
    expect(JSON.stringify(view)).not.toContain(webhookUrl);
    expect(JSON.stringify(view)).not.toContain(webhookToken);
  });

  it("requires both webhook environment variables", () => {
    expect(
      buildPublishingIntegrationView({
        webhookUrl: "https://deploy.example/hooks/rebuild",
      }),
    ).toEqual({
      webhookUrlConfigured: true,
      webhookTokenConfigured: false,
      ready: false,
    });
  });
});

describe("email delivery settings view", () => {
  it("marks Dummy as log-only and never exposes the SendGrid key", () => {
    const sendGridApiKey = "SG.a-production-secret";
    const view = buildEmailDeliveryIntegrationView({
      provider: "Dummy",
      sendGridApiKey,
      fromAddress: "noreply@motionpress.local",
      fromName: "MotionPress",
    });

    expect(view).toEqual({
      provider: "Dummy",
      sendGridApiKeyConfigured: true,
      fromAddressConfigured: false,
      fromNameConfigured: true,
      ready: false,
    });
    expect(JSON.stringify(view)).not.toContain(sendGridApiKey);
  });

  it("requires SendGrid, an API key, and a public-domain sender", () => {
    expect(
      buildEmailDeliveryIntegrationView({
        provider: "SendGrid",
        sendGridApiKey: "SG.a-production-secret",
        fromAddress: "hello@motionpress.example",
        fromName: "MotionPress",
      }),
    ).toMatchObject({
      provider: "SendGrid",
      sendGridApiKeyConfigured: true,
      fromAddressConfigured: true,
      ready: true,
    });
  });
});
