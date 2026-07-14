import OpenAI from "openai";
import { env, prisma } from "wasp/server";
import type {
  AiProviderConnectionResult,
  AiProviderSettingsInput,
  AiProviderSettingsView,
} from "../providerSettings";
import { hasSameCredentialOrigin } from "../providerSettings";
import { AiProviderConfigError, validateMasterKey } from "./providerEncryption";
import { createCompatibleChatCompletion } from "./providerCompatibility";
import { createProviderConfigFingerprint } from "./providerFingerprint";
import { createSafeProviderFetch } from "./providerNetworkSecurity";
import {
  buildAiProviderSettingsView,
  resolveEffectiveAiProviderConfig,
  type AiProviderEnvironment,
  type EffectiveAiProviderConfig,
  type StoredAiProviderConfig,
} from "./providerResolution";

export const AI_PROVIDER_CONFIG_ID = "primary";

export class AiProviderCandidateError extends AiProviderConfigError {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderCandidateError";
  }
}

const storedConfigSelect = {
  baseUrl: true,
  model: true,
  encryptedApiKey: true,
  apiKeyHint: true,
  hourlyTokenLimit: true,
  maxCompletionTokens: true,
  updatedAt: true,
} as const;

export async function getEffectiveAiProviderConfig(): Promise<EffectiveAiProviderConfig> {
  const stored = await getStoredAiProviderConfig();
  return resolveEffectiveAiProviderConfig({
    stored,
    environment: getAiProviderEnvironment(),
    encryptionKey: env.AI_CONFIG_ENCRYPTION_KEY,
  });
}

export async function getAiProviderSettingsView(): Promise<AiProviderSettingsView> {
  return buildAiProviderSettingsView({
    stored: await getStoredAiProviderConfig(),
    environment: getAiProviderEnvironment(),
  });
}

export async function getStoredAiProviderConfig(): Promise<StoredAiProviderConfig | null> {
  return prisma.aiProviderConfig.findUnique({
    where: { id: AI_PROVIDER_CONFIG_ID },
    select: storedConfigSelect,
  });
}

export function getAiProviderEnvironment(): AiProviderEnvironment {
  return {
    apiKey: env.OPENAI_API_KEY,
    baseUrl: env.OPENAI_BASE_URL,
    model: env.OPENAI_MODEL,
    studioModel: env.AI_STUDIO_MODEL,
    hourlyTokenLimit: env.AI_HOURLY_TOKEN_LIMIT?.toString(),
    maxCompletionTokens: env.AI_MAX_COMPLETION_TOKENS?.toString(),
  };
}

export function getAiConfigEncryptionKey(): string {
  const key = env.AI_CONFIG_ENCRYPTION_KEY;
  validateMasterKey(key);
  return key!;
}

export function createAiProviderClient(
  config: EffectiveAiProviderConfig,
): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    timeout: 60_000,
    maxRetries: 0,
    fetch: createSafeProviderFetch(config.baseUrl),
  });
}

export async function testAiProviderCandidate(
  input: AiProviderSettingsInput,
): Promise<AiProviderConnectionResult & { configFingerprint: string }> {
  const current = input.apiKey ? null : await getEffectiveAiProviderConfig();
  if (current && !hasSameCredentialOrigin(current.baseUrl, input.baseUrl)) {
    throw new AiProviderCandidateError(
      "Enter the API key again when changing the provider Base URL",
    );
  }
  const candidate: EffectiveAiProviderConfig = {
    source: current?.source ?? "database",
    baseUrl: input.baseUrl,
    model: input.model,
    apiKey: input.apiKey ?? current!.apiKey,
    hourlyTokenLimit: current?.hourlyTokenLimit ?? 100_000,
    maxCompletionTokens: current?.maxCompletionTokens ?? 12_000,
  };
  const client = createAiProviderClient(candidate);
  const startedAt = Date.now();

  await createCompatibleChatCompletion(
    (params) => client.chat.completions.create(params),
    {
      params: {
        model: candidate.model,
        messages: [{ role: "user", content: "Reply with OK." }],
        temperature: 0,
      },
      maxCompletionTokens: 1,
    },
  );

  return {
    ok: true,
    latencyMs: Date.now() - startedAt,
    configFingerprint: createProviderConfigFingerprint(candidate),
  };
}
