import { action, api, job, page, query, route, type Spec } from "@wasp.sh/spec";

import { AiProviderSettingsPage } from "./AiProviderSettingsPage" with { type: "ref" };
import { AiStudioPage } from "./AiStudioPage" with { type: "ref" };
import {
  generateAiAnimation,
  getAiStudioDashboard,
  optimizeAiAnimationPrompt,
  requestAiAnimationVideo,
  retryAiAnimationVideo,
} from "./server/operations" with { type: "ref" };
import {
  getAiProviderSettings,
  resetAiProviderSettings,
  testAiProviderConnection,
  updateAiProviderSettings,
} from "./server/providerSettingsOperations" with { type: "ref" };
import { getSystemReadiness } from "./server/readiness" with { type: "ref" };
import { downloadAiAnimationVideo } from "./server/videoApi" with { type: "ref" };
import { renderAiAnimationVideoJob } from "./server/videoJob" with { type: "ref" };

const aiEntities = [
  "AiAnimation",
  "AiUsageLog",
  "AiQuotaWindow",
  "AiProviderConfig",
];

// Provider credentials remain configurable from the admin page.

export const aiStudioSpec: Spec = [
  route(
    "AiStudioRoute",
    "/ai-studio",
    page(AiStudioPage, { authRequired: true }),
  ),
  route(
    "AiProviderSettingsRoute",
    "/admin/ai-provider",
    page(AiProviderSettingsPage, { authRequired: true }),
  ),
  query(getAiStudioDashboard, { entities: aiEntities }),
  query(getSystemReadiness, {
    entities: ["AiProviderConfig", "AiUsageLog"],
  }),
  query(getAiProviderSettings, { entities: ["AiProviderConfig"] }),
  action(updateAiProviderSettings, { entities: ["AiProviderConfig"] }),
  action(resetAiProviderSettings, { entities: ["AiProviderConfig"] }),
  action(testAiProviderConnection, {
    entities: ["AiProviderConfig", "AiUsageLog"],
  }),
  action(optimizeAiAnimationPrompt, { entities: aiEntities }),
  action(generateAiAnimation, { entities: aiEntities }),
  action(requestAiAnimationVideo, { entities: aiEntities }),
  action(retryAiAnimationVideo, { entities: aiEntities }),
  api("GET", "/ai-studio/videos/:id", downloadAiAnimationVideo, {
    entities: ["AiAnimation"],
    auth: true,
  }),
  job(renderAiAnimationVideoJob, {
    executor: "PgBoss",
    entities: aiEntities,
    performExecutorOptions: { pgBoss: { retryLimit: 2 } },
  }),
];
