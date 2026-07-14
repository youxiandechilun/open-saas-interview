import * as z from "zod";

export const demoAiAppEnvSchema = z.object({
  OPENAI_API_KEY: z.string().trim().min(1).optional(),
  OPENAI_BASE_URL: z.url().optional(),
  OPENAI_MODEL: z.string().min(1).optional(),
});
