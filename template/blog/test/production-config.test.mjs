import assert from "node:assert/strict";
import test from "node:test";
import {
  validateProductionBuildConfig,
  validateProductionConfig,
} from "../scripts/production-config.mjs";

test("production publishing rejects placeholder or missing origins", () => {
  assert.throws(() => validateProductionConfig({}), /PUBLIC_SITE_URL/);
  assert.throws(
    () =>
      validateProductionConfig({
        PUBLIC_SITE_URL: "https://your-site.com",
        PUBLIC_APP_URL: "https://app.example.com",
        CMS_CONTENT_API_URL: "https://api.example.com/content-cms/published",
      }),
    /deployed public HTTPS URL/,
  );
});

test("production publishing accepts explicit site and CMS URLs", () => {
  assert.deepEqual(
    validateProductionConfig({
      PUBLIC_SITE_URL: "https://saas.example.com",
      PUBLIC_APP_URL: "https://app.saas.example.com",
      CMS_CONTENT_API_URL: "https://api.saas.example.com/content-cms/published",
    }),
    {
      siteUrl: "https://saas.example.com/",
      appUrl: "https://app.saas.example.com/",
      cmsUrl: "https://api.saas.example.com/content-cms/published",
    },
  );
});

test("ordinary builds require online CMS or an explicit offline snapshot", () => {
  assert.throws(
    () =>
      validateProductionBuildConfig({
        PUBLIC_SITE_URL: "https://saas.example.com",
        PUBLIC_APP_URL: "https://app.saas.example.com",
      }),
    /CMS_CONTENT_API_URL is required unless CMS_CONTENT_OFFLINE=1/,
  );

  assert.deepEqual(
    validateProductionBuildConfig({
      PUBLIC_SITE_URL: "https://saas.example.com",
      PUBLIC_APP_URL: "https://app.saas.example.com",
      CMS_CONTENT_OFFLINE: "1",
    }),
    {
      siteUrl: "https://saas.example.com/",
      appUrl: "https://app.saas.example.com/",
      cmsUrl: null,
      offline: true,
    },
  );
});
