import {
  aiProviderBaseUrlSchema,
  aiProviderHourlyTokenLimitSchema,
  aiProviderMaxCompletionTokensSchema,
  aiProviderModelSchema,
  type AiProviderSettingsView,
} from "../providerSettings";
import {
  AiProviderConfigError,
  createApiKeyHint,
  decryptApiKey,
} from "./providerEncryption";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
export const DEFAULT_HOURLY_TOKEN_LIMIT = 100_000;
export const DEFAULT_MAX_COMPLETION_TOKENS = 12_000;

export type StoredAiProviderConfig = {
  baseUrl: string;
  model: string;
  encryptedApiKey: string;
  apiKeyHint: string;
  hourlyTokenLimit: number;
  maxCompletionTokens: number;
  updatedAt: Date;
};

export type AiProviderEnvironment = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  studioModel?: string;
  hourlyTokenLimit?: string;
  maxCompletionTokens?: string;
};

export type EffectiveAiProviderConfig = {
  source: "database" | "environment";
  baseUrl: string;
  model: string;
  apiKey: string;
  hourlyTokenLimit: number;
  maxCompletionTokens: number;
};

export type AiProviderLimits = Pick<
  EffectiveAiProviderConfig,
  "hourlyTokenLimit" | "maxCompletionTokens"
>;

export function resolveAiProviderLimits(input: {
  stored: Pick<
    StoredAiProviderConfig,
    "hourlyTokenLimit" | "maxCompletionTokens"
  > | null;
  environment: AiProviderEnvironment;
}): AiProviderLimits {
  if (input.stored) {
    return {
      hourlyTokenLimit: aiProviderHourlyTokenLimitSchema.parse(
        input.stored.hourlyTokenLimit,
      ),
      maxCompletionTokens: aiProviderMaxCompletionTokensSchema.parse(
        input.stored.maxCompletionTokens,
      ),
    };
  }

  return {
    hourlyTokenLimit: parseEnvironmentNumber(
      input.environment.hourlyTokenLimit,
      DEFAULT_HOURLY_TOKEN_LIMIT,
      aiProviderHourlyTokenLimitSchema,
    ),
    maxCompletionTokens: parseEnvironmentNumber(
      input.environment.maxCompletionTokens,
      DEFAULT_MAX_COMPLETION_TOKENS,
      aiProviderMaxCompletionTokensSchema,
    ),
  };
}

export function resolveEffectiveAiProviderConfig(input: {
  stored: StoredAiProviderConfig | null;
  environment: AiProviderEnvironment;
  encryptionKey?: string;
}): EffectiveAiProviderConfig {
  const limits = resolveAiProviderLimits(input);
  if (input.stored) {
    return {
      source: "database",
      baseUrl: aiProviderBaseUrlSchema.parse(input.stored.baseUrl),
      model: aiProviderModelSchema.parse(input.stored.model),
      apiKey: decryptApiKey(
        input.stored.encryptedApiKey,
        input.encryptionKey ?? "",
      ),
      ...limits,
    };
  }

  const apiKey = normalizeEnvironmentApiKey(input.environment.apiKey);
  if (!apiKey) {
    throw new AiProviderConfigError("AI provider API key is not configured");
  }

  return {
    source: "environment",
    baseUrl: aiProviderBaseUrlSchema.parse(
      input.environment.baseUrl ?? DEFAULT_BASE_URL,
    ),
    model: aiProviderModelSchema.parse(
      input.environment.studioModel ?? input.environment.model ?? DEFAULT_MODEL,
    ),
    apiKey,
    ...limits,
  };
}

export function buildAiProviderSettingsView(input: {
  stored: StoredAiProviderConfig | null;
  environment: AiProviderEnvironment;
}): AiProviderSettingsView {
  const limits = resolveAiProviderLimits(input);
  if (input.stored) {
    return {
      source: "database",
      baseUrl: aiProviderBaseUrlSchema.parse(input.stored.baseUrl),
      model: aiProviderModelSchema.parse(input.stored.model),
      hasApiKey: true,
      apiKeyHint: input.stored.apiKeyHint,
      ...limits,
      updatedAt: input.stored.updatedAt,
    };
  }

  const apiKey = normalizeEnvironmentApiKey(input.environment.apiKey);
  return {
    source: "environment",
    baseUrl: aiProviderBaseUrlSchema.parse(
      input.environment.baseUrl ?? DEFAULT_BASE_URL,
    ),
    model: aiProviderModelSchema.parse(
      input.environment.studioModel ?? input.environment.model ?? DEFAULT_MODEL,
    ),
    hasApiKey: Boolean(apiKey),
    apiKeyHint: apiKey ? createApiKeyHint(apiKey) : null,
    ...limits,
    updatedAt: null,
  };
}

function parseEnvironmentNumber(
  value: string | undefined,
  fallback: number,
  schema: { parse: (value: unknown) => number },
): number {
  if (!value?.trim()) return fallback;
  try {
    return schema.parse(Number(value));
  } catch {
    return fallback;
  }
}

export function normalizeEnvironmentApiKey(
  value: string | undefined,
): string | undefined {
  const apiKey = value?.trim();
  if (!apiKey) return undefined;

  const placeholder = apiKey.toLowerCase();
  if (
    placeholder === "sk-k..." ||
    placeholder === "sk-..." ||
    placeholder === "replace-me" ||
    placeholder === "replace-with-openai-api-key" ||
    placeholder === "your-openai-api-key" ||
    placeholder === "<openai_api_key>"
  ) {
    return undefined;
  }
  return apiKey;
}
