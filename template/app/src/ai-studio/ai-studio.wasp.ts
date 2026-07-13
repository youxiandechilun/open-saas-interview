import { action, api, job, page, query, route, type Spec } from "@wasp.sh/spec";

import { AiStudioPage } from "./AiStudioPage" with { type: "ref" };
import {
  generateAiAnimation,
  getAiStudioDashboard,
  optimizeAiAnimationPrompt,
  requestAiAnimationVideo,
  retryAiAnimationVideo,
} from "./server/operations" with { type: "ref" };
import { downloadAiAnimationVideo } from "./server/videoApi" with { type: "ref" };
import { renderAiAnimationVideoJob } from "./server/videoJob" with { type: "ref" };

const aiEntities = ["AiAnimation", "AiUsageLog", "AiQuotaWindow"];

export const aiStudioSpec: Spec = [
  route(
    "AiStudioRoute",
    "/ai-studio",
    page(AiStudioPage, { authRequired: true }),
  ),
  query(getAiStudioDashboard, { entities: aiEntities }),
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
