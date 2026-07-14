import { env, HttpError } from "wasp/server";
import type {
  GetAiProviderSettings,
  ResetAiProviderSettings,
  TestAiProviderConnection,
  UpdateAiProviderSettings,
} from "wasp/server/operations";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";
import {
  isActiveAdministrator,
  type UserRoleValue,
} from "../../user/accessPolicy";
import {
  aiProviderSettingsInputSchema,
  buildEmailDeliveryIntegrationView,
  buildPublishingIntegrationView,
  hasSameCredentialOrigin,
  type AiProviderConnectionResult,
  type AiProviderSettingsInput,
  type AiProviderSettingsView,
  type AiServiceSettingsView,
} from "../providerSettings";
import {
  AI_PROVIDER_CONFIG_ID,
  AiProviderCandidateError,
  getAiConfigEncryptionKey,
  getAiProviderEnvironment,
  getAiProviderSettingsView,
  testAiProviderCandidate,
} from "./providerConfig";
import {
  completeProviderConnectionTest,
  failProviderConnectionTest,
  reserveProviderConnectionTest,
} from "./providerConnectionAudit";
import {
  AiProviderConfigError,
  createApiKeyHint,
  decryptApiKey,
  encryptApiKey,
} from "./providerEncryption";
import {
  AiProviderNetworkError,
  assertPublicHttpsProviderUrl,
} from "./providerNetworkSecurity";
import {
  buildAiProviderSettingsView,
  normalizeEnvironmentApiKey,
} from "./providerResolution";

type AdminUser = {
  id: string;
  isAdmin: boolean;
  role: UserRoleValue;
  isDisabled: boolean;
};

export const getAiProviderSettings: GetAiProviderSettings<
  void,
  AiServiceSettingsView
> = async (_args, context) => {
  requireAdmin(context.user);
  return {
    ...(await getAiProviderSettingsView()),
    publishingIntegration: buildPublishingIntegrationView({
      webhookUrl: env.CMS_REBUILD_WEBHOOK_URL,
      webhookToken: env.CMS_REBUILD_WEBHOOK_TOKEN,
    }),
    emailDelivery: buildEmailDeliveryIntegrationView({
      provider: env.EMAIL_PROVIDER,
      sendGridApiKey: env.SENDGRID_API_KEY,
      fromAddress: env.EMAIL_FROM_ADDRESS,
      fromName: env.EMAIL_FROM_NAME,
    }),
  };
};

export const updateAiProviderSettings: UpdateAiProviderSettings<
  AiProviderSettingsInput,
  AiProviderSettingsView
> = async (rawArgs, context) => {
  const user = requireAdmin(context.user);
  const args = ensureArgsSchemaOrThrowHttpError(
    aiProviderSettingsInputSchema,
    rawArgs,
  );
  const existing = await context.entities.AiProviderConfig.findUnique({
    where: { id: AI_PROVIDER_CONFIG_ID },
    select: {
      baseUrl: true,
      encryptedApiKey: true,
      apiKeyHint: true,
      hourlyTokenLimit: true,
      maxCompletionTokens: true,
    },
  });

  try {
    await assertPublicHttpsProviderUrl(args.baseUrl);
    const encryptionKey = getAiConfigEncryptionKey();
    const environment = getAiProviderEnvironment();
    const currentBaseUrl = args.apiKey
      ? args.baseUrl
      : (existing?.baseUrl ??
        buildAiProviderSettingsView({
          stored: null,
          environment,
        }).baseUrl);
    const credential = resolveCredentialForSave({
      apiKey: args.apiKey,
      existing,
      environmentApiKey: environment.apiKey,
      encryptionKey,
      currentBaseUrl,
      nextBaseUrl: args.baseUrl,
    });
    const saved = await context.entities.AiProviderConfig.upsert({
      where: { id: AI_PROVIDER_CONFIG_ID },
      create: {
        id: AI_PROVIDER_CONFIG_ID,
        baseUrl: args.baseUrl,
        model: args.model,
        encryptedApiKey: credential.encryptedApiKey,
        apiKeyHint: credential.apiKeyHint,
        hourlyTokenLimit: args.hourlyTokenLimit,
        maxCompletionTokens: args.maxCompletionTokens,
        updatedById: user.id,
      },
      update: {
        baseUrl: args.baseUrl,
        model: args.model,
        encryptedApiKey: credential.encryptedApiKey,
        apiKeyHint: credential.apiKeyHint,
        hourlyTokenLimit: args.hourlyTokenLimit,
        maxCompletionTokens: args.maxCompletionTokens,
        updatedById: user.id,
      },
      select: {
        baseUrl: true,
        model: true,
        encryptedApiKey: true,
        apiKeyHint: true,
        hourlyTokenLimit: true,
        maxCompletionTokens: true,
        updatedAt: true,
      },
    });

    return buildAiProviderSettingsView({
      stored: saved,
      environment: getAiProviderEnvironment(),
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof AiProviderNetworkError) {
      throw new HttpError(400, error.message);
    }
    if (error instanceof AiProviderConfigError) {
      throw new HttpError(503, error.message);
    }
    throw new HttpError(500, "AI provider settings could not be saved");
  }
};

export const resetAiProviderSettings: ResetAiProviderSettings<
  void,
  AiProviderSettingsView
> = async (_args, context) => {
  requireAdmin(context.user);
  const fallback = buildAiProviderSettingsView({
    stored: null,
    environment: getAiProviderEnvironment(),
  });
  await context.entities.AiProviderConfig.deleteMany({
    where: { id: AI_PROVIDER_CONFIG_ID },
  });
  return fallback;
};

export const testAiProviderConnection: TestAiProviderConnection<
  AiProviderSettingsInput,
  AiProviderConnectionResult
> = async (rawArgs, context) => {
  const user = requireAdmin(context.user);
  const args = ensureArgsSchemaOrThrowHttpError(
    aiProviderSettingsInputSchema,
    rawArgs,
  );

  let reservation;
  try {
    reservation = await reserveProviderConnectionTest({ userId: user.id });
  } catch {
    throw new HttpError(503, "Connection test audit is unavailable");
  }
  if (!reservation.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(reservation.retryAfterMs / 1_000),
    );
    throw new HttpError(
      429,
      `Connection tests are limited to once every 30 seconds; retry in ${retryAfterSeconds} seconds`,
    );
  }

  const startedAt = Date.now();

  try {
    const result = await testAiProviderCandidate(args);
    try {
      await completeProviderConnectionTest({
        auditId: reservation.auditId,
        latencyMs: result.latencyMs,
        model: args.model,
        configFingerprint: result.configFingerprint,
      });
    } catch {
      throw new HttpError(500, "Connection test audit could not be completed");
    }
    return { ok: true, latencyMs: result.latencyMs };
  } catch (error) {
    await failProviderConnectionTest({
      auditId: reservation.auditId,
      latencyMs: Date.now() - startedAt,
      errorCode: connectionFailureCode(error),
    }).catch(() => undefined);
    if (error instanceof HttpError) throw error;
    if (
      error instanceof AiProviderCandidateError ||
      error instanceof AiProviderNetworkError
    ) {
      throw new HttpError(400, error.message);
    }
    if (error instanceof AiProviderConfigError) {
      throw new HttpError(503, error.message);
    }
    throw new HttpError(502, connectionFailureMessage(error));
  }
};

export function requireAdmin(user: AdminUser | null | undefined): AdminUser {
  if (!user) throw new HttpError(401, "Authentication is required");
  if (!isActiveAdministrator(user)) {
    throw new HttpError(403, "Active administrator access is required");
  }
  return user;
}

function resolveCredentialForSave(input: {
  apiKey?: string;
  existing: {
    baseUrl: string;
    encryptedApiKey: string;
    apiKeyHint: string;
  } | null;
  environmentApiKey?: string;
  encryptionKey: string;
  currentBaseUrl: string;
  nextBaseUrl: string;
}): { encryptedApiKey: string; apiKeyHint: string } {
  if (input.apiKey) {
    return {
      encryptedApiKey: encryptApiKey(input.apiKey, input.encryptionKey),
      apiKeyHint: createApiKeyHint(input.apiKey),
    };
  }

  if (!hasSameCredentialOrigin(input.currentBaseUrl, input.nextBaseUrl)) {
    throw new HttpError(
      400,
      "Enter the API key again when changing the provider Base URL",
    );
  }

  if (input.existing) {
    decryptApiKey(input.existing.encryptedApiKey, input.encryptionKey);
    return {
      encryptedApiKey: input.existing.encryptedApiKey,
      apiKeyHint: input.existing.apiKeyHint,
    };
  }

  const environmentApiKey = normalizeEnvironmentApiKey(input.environmentApiKey);
  if (!environmentApiKey) {
    throw new HttpError(400, "Enter an API key before saving settings");
  }
  return {
    encryptedApiKey: encryptApiKey(environmentApiKey, input.encryptionKey),
    apiKeyHint: createApiKeyHint(environmentApiKey),
  };
}

function connectionFailureCode(error: unknown): string {
  if (
    error instanceof AiProviderCandidateError ||
    error instanceof AiProviderNetworkError
  ) {
    return "PROVIDER_INPUT_REJECTED";
  }
  if (error instanceof AiProviderConfigError) return "PROVIDER_CONFIG_ERROR";
  const status = getHttpStatus(error);
  return status ? `PROVIDER_HTTP_${status}` : "PROVIDER_CONNECTION_FAILED";
}

function connectionFailureMessage(error: unknown): string {
  const status = getHttpStatus(error);
  if (status === 401 || status === 403) {
    return "AI provider rejected the configured credentials";
  }
  if (status === 404) {
    return "AI provider endpoint or model was not found";
  }
  if (status === 429) {
    return "AI provider rate limit prevented the connection test";
  }
  return "AI provider connection test failed";
}

function getHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("status" in error)) {
    return undefined;
  }
  const status = error.status;
  return typeof status === "number" ? status : undefined;
}
