import { defineEnvValidationSchema } from "wasp/env";

import * as z from "zod";
import { aiStudioEnvSchema } from "./ai-studio/env";
import { authEnvSchema } from "./auth/env";
import { contentCmsEnvSchema } from "./content-cms/env";

const optionalAnalyticsEnvSchema = z.object({
  PLAUSIBLE_API_KEY: z.string().default("disabled"),
  PLAUSIBLE_SITE_ID: z.string().default("disabled"),
  PLAUSIBLE_BASE_URL: z.string().default("https://disabled.invalid"),
  GOOGLE_ANALYTICS_CLIENT_EMAIL: z.string().default("disabled@invalid.local"),
  GOOGLE_ANALYTICS_PRIVATE_KEY: z.string().default("disabled"),
  GOOGLE_ANALYTICS_PROPERTY_ID: z.string().default("disabled"),
});

const optionalServerSecret = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.string().trim().min(1).optional(),
);

const emailDeliveryEnvSchema = z.object({
  EMAIL_PROVIDER: z.enum(["Dummy", "SendGrid"]).default("Dummy"),
  SENDGRID_API_KEY: optionalServerSecret,
  EMAIL_FROM_ADDRESS: z
    .string()
    .trim()
    .min(3)
    .default("noreply@motionpress.local"),
  EMAIL_FROM_NAME: z.string().trim().min(1).max(120).default("MotionPress"),
});

// Wasp merges this schema with its built-in env var validations and uses it
// to validate `process.env` at server startup. Access the validated env vars
// with `import { env } from 'wasp/server'` instead of using `process.env` directly.
// https://wasp.sh/docs/project/env-vars#custom-env-var-validations
export const serverEnvValidationSchema = defineEnvValidationSchema(
  z.object({
    ...authEnvSchema.shape,
    ...aiStudioEnvSchema.shape,
    ...contentCmsEnvSchema.shape,
    ...emailDeliveryEnvSchema.shape,
    ...optionalAnalyticsEnvSchema.shape,
  }),
);
