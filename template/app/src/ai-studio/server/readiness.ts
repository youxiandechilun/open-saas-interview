import ffmpegPath from "ffmpeg-static";
import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { env, HttpError, prisma } from "wasp/server";
import {
  isActiveAdministrator,
  type UserRoleValue,
} from "../../user/accessPolicy";
import {
  buildEmailDeliveryIntegrationView,
  buildPublishingIntegrationView,
  type EmailDeliveryIntegrationView,
  type PublishingIntegrationView,
} from "../providerSettings";
import {
  getAiProviderEnvironment,
  getStoredAiProviderConfig,
} from "./providerConfig";
import { PROVIDER_CONNECTION_TEST_OPERATION } from "./providerConnectionAudit";
import { isValidMasterKey } from "./providerEncryption";
import { createProviderConfigFingerprint } from "./providerFingerprint";
import {
  buildAiProviderSettingsView,
  resolveEffectiveAiProviderConfig,
} from "./providerResolution";
import { getVideoStorageRoot } from "./videoRenderer";

export type ReadinessCheckKey =
  | "database"
  | "aiProvider"
  | "encryption"
  | "renderRuntime"
  | "renderStorage"
  | "emailDelivery"
  | "blogPublishing";

export type ReadinessStatus = "ready" | "action_required" | "unavailable";

export type ReadinessCheck = {
  key: ReadinessCheckKey;
  label: string;
  status: ReadinessStatus;
  detail: string;
  actionPath: string | null;
};

export type SystemReadiness = {
  overall: ReadinessStatus;
  checkedAt: Date;
  checks: ReadinessCheck[];
};

type ReadinessContext = {
  user?: {
    id: string;
    isAdmin: boolean;
    role: UserRoleValue;
    isDisabled: boolean;
  };
};

export const getSystemReadiness = async (
  _args: void,
  context: ReadinessContext,
): Promise<SystemReadiness> => {
  if (!context.user) throw new HttpError(401, "Authentication required");
  if (context.user.isDisabled) {
    throw new HttpError(403, "Disabled accounts cannot access the workspace");
  }

  const adminAction = (path: string): string | null =>
    context.user && isActiveAdministrator(context.user) ? path : null;
  const database = await checkDatabase();
  const providerChecks = await checkProviderAndEncryption(adminAction);
  const [renderRuntime, renderStorage] = await Promise.all([
    checkRenderRuntime(),
    checkRenderStorage(),
  ]);
  const emailDelivery = checkEmailDelivery(adminAction);
  const blogPublishing = checkBlogPublishing(adminAction);
  const checks = [
    database,
    ...providerChecks,
    renderRuntime,
    renderStorage,
    emailDelivery,
    blogPublishing,
  ];

  return {
    overall: summarizeReadiness(checks),
    checkedAt: new Date(),
    checks,
  };
};

export function summarizeReadiness(
  checks: Pick<ReadinessCheck, "status">[],
): ReadinessStatus {
  if (checks.some((check) => check.status === "unavailable")) {
    return "unavailable";
  }
  if (checks.some((check) => check.status === "action_required")) {
    return "action_required";
  }
  return "ready";
}

async function checkDatabase(): Promise<ReadinessCheck> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return check("database", "Database", "ready", "Database is reachable.");
  } catch {
    return check(
      "database",
      "Database",
      "unavailable",
      "Database is unavailable; migrations and connection settings need attention.",
    );
  }
}

async function checkProviderAndEncryption(
  adminAction: (path: string) => string | null,
): Promise<ReadinessCheck[]> {
  const environment = getAiProviderEnvironment();
  let stored: Awaited<ReturnType<typeof getStoredAiProviderConfig>>;
  try {
    stored = await getStoredAiProviderConfig();
  } catch {
    return [
      check(
        "aiProvider",
        "AI provider",
        "unavailable",
        "Provider configuration cannot be read until the database is available.",
        adminAction("/admin/ai-provider"),
      ),
      check(
        "encryption",
        "Credential encryption",
        "unavailable",
        "Credential encryption state cannot be verified.",
        adminAction("/admin/ai-provider"),
      ),
    ];
  }

  const encryptionKey = env.AI_CONFIG_ENCRYPTION_KEY;
  let encryption: ReadinessCheck;
  if (!encryptionKey) {
    encryption = check(
      "encryption",
      "Credential encryption",
      "action_required",
      "Configure the credential encryption key before saving provider secrets.",
      adminAction("/admin/ai-provider"),
    );
  } else if (!isValidMasterKey(encryptionKey)) {
    encryption = check(
      "encryption",
      "Credential encryption",
      "unavailable",
      "The credential encryption key is invalid.",
      adminAction("/admin/ai-provider"),
    );
  } else {
    encryption = check(
      "encryption",
      "Credential encryption",
      "ready",
      "Provider credentials can be encrypted at rest.",
    );
  }

  let view: ReturnType<typeof buildAiProviderSettingsView>;
  try {
    view = buildAiProviderSettingsView({ stored, environment });
  } catch {
    return [
      check(
        "aiProvider",
        "AI provider",
        "action_required",
        "Provider settings are invalid and need to be corrected.",
        adminAction("/admin/ai-provider"),
      ),
      encryption,
    ];
  }
  if (!view.hasApiKey) {
    return [
      check(
        "aiProvider",
        "AI provider",
        "action_required",
        "Configure provider credentials and test the connection.",
        adminAction("/admin/ai-provider"),
      ),
      encryption,
    ];
  }

  // A stored credential is only usable when the current key can decrypt it.
  let effectiveConfig: ReturnType<typeof resolveEffectiveAiProviderConfig>;
  try {
    effectiveConfig = resolveEffectiveAiProviderConfig({
      stored,
      environment,
      encryptionKey,
    });
  } catch {
    if (stored) {
      encryption = check(
        "encryption",
        "Credential encryption",
        "unavailable",
        "Stored provider credentials cannot be decrypted with the current key.",
        adminAction("/admin/ai-provider"),
      );
      return [
        check(
          "aiProvider",
          "AI provider",
          "action_required",
          "Provider credentials cannot be used until encryption is repaired.",
          adminAction("/admin/ai-provider"),
        ),
        encryption,
      ];
    }
    return [
      check(
        "aiProvider",
        "AI provider",
        "action_required",
        "Provider credentials are incomplete or invalid.",
        adminAction("/admin/ai-provider"),
      ),
      encryption,
    ];
  }

  let latestConnectionTest: {
    status: string;
    createdAt: Date;
    responseJson: unknown;
  } | null;
  try {
    latestConnectionTest = await prisma.aiUsageLog.findFirst({
      where: { operation: PROVIDER_CONNECTION_TEST_OPERATION },
      orderBy: { createdAt: "desc" },
      select: { status: true, createdAt: true, responseJson: true },
    });
  } catch {
    return [
      check(
        "aiProvider",
        "AI provider",
        "unavailable",
        "Provider connection history cannot be verified.",
        adminAction("/admin/ai-provider"),
      ),
      encryption,
    ];
  }
  const testedModel =
    latestConnectionTest?.responseJson &&
    typeof latestConnectionTest.responseJson === "object" &&
    !Array.isArray(latestConnectionTest.responseJson) &&
    "model" in latestConnectionTest.responseJson &&
    typeof latestConnectionTest.responseJson.model === "string"
      ? latestConnectionTest.responseJson.model
      : null;
  const testedFingerprint =
    latestConnectionTest?.responseJson &&
    typeof latestConnectionTest.responseJson === "object" &&
    !Array.isArray(latestConnectionTest.responseJson) &&
    "configFingerprint" in latestConnectionTest.responseJson &&
    typeof latestConnectionTest.responseJson.configFingerprint === "string"
      ? latestConnectionTest.responseJson.configFingerprint
      : null;
  const expectedFingerprint = createProviderConfigFingerprint(effectiveConfig);
  const connectionIsCurrent = Boolean(
    latestConnectionTest?.status === "SUCCEEDED" &&
      testedModel === view.model &&
      testedFingerprint === expectedFingerprint &&
      (!stored || latestConnectionTest.createdAt >= stored.updatedAt),
  );
  if (!connectionIsCurrent) {
    return [
      check(
        "aiProvider",
        "AI provider",
        "action_required",
        "Provider settings are present but need a current successful connection test.",
        adminAction("/admin/ai-provider"),
      ),
      encryption,
    ];
  }
  return [
    check(
      "aiProvider",
      "AI provider",
      "ready",
      "Provider credentials, model, and usage limits are configured and tested.",
      adminAction("/admin/ai-provider"),
    ),
    encryption,
  ];
}

async function checkRenderRuntime(): Promise<ReadinessCheck> {
  try {
    if (!ffmpegPath) throw new Error("ffmpeg is unavailable");
    const { chromium } = await import("playwright");
    await Promise.all([
      access(ffmpegPath, constants.F_OK),
      access(chromium.executablePath(), constants.F_OK),
    ]);
    return check(
      "renderRuntime",
      "Video renderer",
      "ready",
      "Browser capture and video encoding runtimes are installed.",
    );
  } catch {
    return check(
      "renderRuntime",
      "Video renderer",
      "unavailable",
      "Browser capture or video encoding runtime is missing.",
    );
  }
}

async function checkRenderStorage(): Promise<ReadinessCheck> {
  try {
    const storageRoot = getVideoStorageRoot();
    await mkdir(storageRoot, { recursive: true });
    await access(storageRoot, constants.R_OK | constants.W_OK);
    return check(
      "renderStorage",
      "Render storage",
      "ready",
      "Render storage is readable and writable; production should mount this absolute path as a persistent volume.",
    );
  } catch {
    return check(
      "renderStorage",
      "Render storage",
      "unavailable",
      "Configure AI_VIDEO_STORAGE_DIR as an absolute writable persistent-volume path.",
    );
  }
}

function checkBlogPublishing(
  adminAction: (path: string) => string | null,
): ReadinessCheck {
  return buildBlogPublishingReadiness(
    buildPublishingIntegrationView({
      webhookUrl: env.CMS_REBUILD_WEBHOOK_URL,
      webhookToken: env.CMS_REBUILD_WEBHOOK_TOKEN,
    }),
    adminAction("/admin/ai-provider#publishing-integration"),
  );
}

function checkEmailDelivery(
  adminAction: (path: string) => string | null,
): ReadinessCheck {
  return buildEmailDeliveryReadiness(
    buildEmailDeliveryIntegrationView({
      provider: env.EMAIL_PROVIDER,
      sendGridApiKey: env.SENDGRID_API_KEY,
      fromAddress: env.EMAIL_FROM_ADDRESS,
      fromName: env.EMAIL_FROM_NAME,
    }),
    adminAction("/admin/ai-provider#email-delivery"),
  );
}

export function buildEmailDeliveryReadiness(
  integration: EmailDeliveryIntegrationView,
  actionPath: string | null,
): ReadinessCheck {
  if (integration.ready) {
    return check(
      "emailDelivery",
      "Account email delivery",
      "ready",
      "SendGrid delivery and a production sender address are configured.",
      actionPath,
    );
  }
  return check(
    "emailDelivery",
    "Account email delivery",
    "action_required",
    integration.provider === "Dummy"
      ? "Dummy delivery only writes verification and reset messages to server logs; configure SendGrid before production."
      : "Complete the SendGrid API key and verified sender address before production.",
    actionPath,
  );
}

export function buildBlogPublishingReadiness(
  integration: PublishingIntegrationView,
  actionPath: string | null,
): ReadinessCheck {
  return integration.ready
    ? check(
        "blogPublishing",
        "Blog publishing",
        "ready",
        "The publication build integration is configured.",
        actionPath,
      )
    : check(
        "blogPublishing",
        "Blog publishing",
        "action_required",
        "Configure the publication webhook before sending articles live.",
        actionPath,
      );
}

function check(
  key: ReadinessCheckKey,
  label: string,
  status: ReadinessStatus,
  detail: string,
  actionPath: string | null = null,
): ReadinessCheck {
  return { key, label, status, detail, actionPath };
}
