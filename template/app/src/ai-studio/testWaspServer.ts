export const env = {
  AI_STUDIO_MODEL: process.env.AI_STUDIO_MODEL,
  AI_HOURLY_TOKEN_LIMIT: process.env.AI_HOURLY_TOKEN_LIMIT
    ? Number(process.env.AI_HOURLY_TOKEN_LIMIT)
    : undefined,
  AI_MAX_COMPLETION_TOKENS: process.env.AI_MAX_COMPLETION_TOKENS
    ? Number(process.env.AI_MAX_COMPLETION_TOKENS)
    : undefined,
  AI_CONFIG_ENCRYPTION_KEY: process.env.AI_CONFIG_ENCRYPTION_KEY,
  AI_VIDEO_STORAGE_DIR: process.env.AI_VIDEO_STORAGE_DIR,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "test-key",
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  CMS_REBUILD_WEBHOOK_URL: process.env.CMS_REBUILD_WEBHOOK_URL,
  CMS_REBUILD_WEBHOOK_TOKEN: process.env.CMS_REBUILD_WEBHOOK_TOKEN,
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER ?? "Dummy",
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  EMAIL_FROM_ADDRESS:
    process.env.EMAIL_FROM_ADDRESS ?? "noreply@motionpress.local",
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME ?? "MotionPress",
};

export const prisma = {};

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
