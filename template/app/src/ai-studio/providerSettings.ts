import * as z from "zod";
import { isForbiddenProviderHostname } from "./providerNetworkPolicy";

export const aiProviderBaseUrlSchema = z
  .string()
  .trim()
  .min(1, "Base URL is required")
  .max(2_048)
  .refine(
    isSafeHttpsUrl,
    "Base URL must be a public HTTPS URL without credentials",
  )
  .transform(normalizeBaseUrl);

export const aiProviderModelSchema = z
  .string()
  .trim()
  .min(1, "Model is required")
  .max(200);

export const aiProviderHourlyTokenLimitSchema = z.coerce
  .number()
  .int()
  .min(1_000, "Hourly token budget must be at least 1,000")
  .max(10_000_000, "Hourly token budget is too high");

export const aiProviderMaxCompletionTokensSchema = z.coerce
  .number()
  .int()
  .min(512, "Max output tokens must be at least 512")
  .max(64_000, "Max output tokens is too high");

const optionalApiKeySchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.string().trim().min(8).max(4_096).optional(),
);

export const aiProviderSettingsInputSchema = z.object({
  baseUrl: aiProviderBaseUrlSchema,
  model: aiProviderModelSchema,
  apiKey: optionalApiKeySchema,
  hourlyTokenLimit: aiProviderHourlyTokenLimitSchema.default(100_000),
  maxCompletionTokens: aiProviderMaxCompletionTokensSchema.default(12_000),
});

export type AiProviderSettingsInput = z.infer<
  typeof aiProviderSettingsInputSchema
>;

export type AiProviderSettingsView = {
  source: "database" | "environment";
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  apiKeyHint: string | null;
  hourlyTokenLimit: number;
  maxCompletionTokens: number;
  updatedAt: Date | null;
};

export type PublishingIntegrationView = {
  webhookUrlConfigured: boolean;
  webhookTokenConfigured: boolean;
  ready: boolean;
};

export type EmailDeliveryIntegrationView = {
  provider: "Dummy" | "SendGrid";
  sendGridApiKeyConfigured: boolean;
  fromAddressConfigured: boolean;
  fromNameConfigured: boolean;
  ready: boolean;
};

export type AiServiceSettingsView = AiProviderSettingsView & {
  publishingIntegration: PublishingIntegrationView;
  emailDelivery: EmailDeliveryIntegrationView;
};

export type AiProviderConnectionResult = {
  ok: true;
  latencyMs: number;
};

export function buildPublishingIntegrationView(input: {
  webhookUrl?: string;
  webhookToken?: string;
}): PublishingIntegrationView {
  const webhookUrlConfigured = Boolean(input.webhookUrl?.trim());
  const webhookTokenConfigured = Boolean(input.webhookToken?.trim());
  return {
    webhookUrlConfigured,
    webhookTokenConfigured,
    ready: webhookUrlConfigured && webhookTokenConfigured,
  };
}

export function buildEmailDeliveryIntegrationView(input: {
  provider?: string;
  sendGridApiKey?: string;
  fromAddress?: string;
  fromName?: string;
}): EmailDeliveryIntegrationView {
  const provider =
    input.provider?.trim().toLowerCase() === "sendgrid" ? "SendGrid" : "Dummy";
  const sendGridApiKeyConfigured = Boolean(input.sendGridApiKey?.trim());
  const fromAddressConfigured = isProductionSenderAddress(input.fromAddress);
  const fromNameConfigured = Boolean(input.fromName?.trim());
  return {
    provider,
    sendGridApiKeyConfigured,
    fromAddressConfigured,
    fromNameConfigured,
    ready:
      provider === "SendGrid" &&
      sendGridApiKeyConfigured &&
      fromAddressConfigured,
  };
}

function isProductionSenderAddress(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return false;
  const domain = normalized.slice(normalized.lastIndexOf("@") + 1);
  return !domain.endsWith(".local") && !domain.endsWith(".localhost");
}

export function hasSameCredentialOrigin(
  currentBaseUrl: string,
  nextBaseUrl: string,
): boolean {
  try {
    return new URL(currentBaseUrl).origin === new URL(nextBaseUrl).origin;
  } catch {
    return false;
  }
}

function isSafeHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      !isForbiddenProviderHostname(url.hostname)
    );
  } catch {
    return false;
  }
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${path}`;
}
