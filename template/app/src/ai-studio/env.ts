import * as z from "zod";
import { isValidMasterKey } from "./server/providerEncryption";

export const aiStudioEnvSchema = z.object({
  // All provider values are optional so a fresh installation can start and be
  // configured from the administrator workspace.
  OPENAI_API_KEY: z.string().trim().min(1).optional(),
  OPENAI_BASE_URL: z.url().optional(),
  OPENAI_MODEL: z.string().trim().min(1).optional(),
  AI_STUDIO_MODEL: z.string().min(1).optional(),
  AI_HOURLY_TOKEN_LIMIT: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(10_000_000)
    .optional(),
  AI_MAX_COMPLETION_TOKENS: z.coerce
    .number()
    .int()
    .min(512)
    .max(64_000)
    .optional(),
  AI_CONFIG_ENCRYPTION_KEY: z
    .string()
    .trim()
    .refine(isValidMasterKey, {
      message: "AI_CONFIG_ENCRYPTION_KEY must decode to exactly 32 bytes",
    })
    .optional(),
  AI_VIDEO_STORAGE_DIR: z.string().min(1).optional(),
});
