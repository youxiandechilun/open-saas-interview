import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { validateProductionConfig } from "./productionConfig.mjs";

describe("application production SEO config", () => {
  it("rejects missing or placeholder public URLs", () => {
    assert.throws(() => validateProductionConfig({}), /ADMIN_EMAILS/);
    assert.throws(
      () =>
        validateProductionConfig({
          EMAIL_PROVIDER: "SendGrid",
          ADMIN_EMAILS: "admin@motion.example.com",
          SENDGRID_API_KEY: "SG.test-key",
          EMAIL_FROM_ADDRESS: "hello@motion.example.com",
          REACT_APP_SITE_URL: "https://your-site.com",
          REACT_APP_BLOG_URL: "https://journal.example.com/blog/",
        }),
      /deployed public HTTPS URL/,
    );
    assert.throws(
      () =>
        validateProductionConfig({
          EMAIL_PROVIDER: "SendGrid",
          ADMIN_EMAILS: "admin@motion.example.com",
          SENDGRID_API_KEY: "SG.test-key",
          EMAIL_FROM_ADDRESS: "hello@motion.example.com",
          REACT_APP_SITE_URL: "http://localhost:3000",
          REACT_APP_BLOG_URL: "https://journal.example.test/blog/",
        }),
      /deployed public HTTPS URL/,
    );
  });

  it("accepts explicit app and journal URLs", () => {
    assert.deepEqual(
      validateProductionConfig({
        EMAIL_PROVIDER: "SendGrid",
        ADMIN_EMAILS: "Admin@motion.example.com, admin@motion.example.com",
        SENDGRID_API_KEY: "SG.test-key",
        EMAIL_FROM_ADDRESS: "hello@motion.example.com",
        REACT_APP_SITE_URL: "https://motion.example.com",
        REACT_APP_BLOG_URL: "https://journal.example.com/blog/",
        AI_VIDEO_STORAGE_DIR: "/var/lib/motionpress/ai-studio-videos",
      }),
      {
        siteUrl: "https://motion.example.com/",
        blogUrl: "https://journal.example.com/blog/",
        videoStorageDir: "/var/lib/motionpress/ai-studio-videos",
        emailProvider: "SendGrid",
        emailFromAddress: "hello@motion.example.com",
        adminEmails: ["admin@motion.example.com"],
      },
    );
  });

  it("requires an absolute persistent video path for production", () => {
    const valid = {
      EMAIL_PROVIDER: "SendGrid",
      ADMIN_EMAILS: "admin@motion.example.com",
      SENDGRID_API_KEY: "SG.test-key",
      EMAIL_FROM_ADDRESS: "hello@motion.example.com",
      REACT_APP_SITE_URL: "https://motion.example.com",
      REACT_APP_BLOG_URL: "https://journal.example.com/blog/",
    };

    assert.throws(
      () => validateProductionConfig(valid),
      /AI_VIDEO_STORAGE_DIR.*absolute path/,
    );
    assert.throws(
      () =>
        validateProductionConfig({
          ...valid,
          AI_VIDEO_STORAGE_DIR: "storage/ai-studio-videos",
        }),
      /AI_VIDEO_STORAGE_DIR.*absolute path/,
    );
  });
});
