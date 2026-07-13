import * as z from "zod";

export const aiStudioEnvSchema = z.object({
  AI_STUDIO_MODEL: z.string().min(1).optional(),
  AI_VIDEO_STORAGE_DIR: z.string().min(1).optional(),
});
