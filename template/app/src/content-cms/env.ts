import * as z from "zod";

export const contentCmsEnvSchema = z.object({
  CMS_CONTENT_API_TOKEN: z.string().min(24).optional(),
  CMS_REBUILD_WEBHOOK_URL: z.url().optional(),
  CMS_REBUILD_WEBHOOK_TOKEN: z.string().min(24).optional(),
});
