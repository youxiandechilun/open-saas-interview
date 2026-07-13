import assert from "node:assert/strict";
import test from "node:test";
import { validateProductionConfig } from "../scripts/production-config.mjs";

test("production publishing rejects placeholder or missing origins", () => {
  assert.throws(() => validateProductionConfig({}), /PUBLIC_SITE_URL/);
  assert.throws(
    () =>
      validateProductionConfig({
        PUBLIC_SITE_URL: "https://your-site.com",
        CMS_CONTENT_API_URL: "https://api.example.com/content-cms/published",
      }),
    /deployed HTTP\(S\) origin/,
  );
});

test("production publishing accepts explicit site and CMS URLs", () => {
  assert.deepEqual(
    validateProductionConfig({
      PUBLIC_SITE_URL: "https://saas.example.com",
      CMS_CONTENT_API_URL: "https://api.saas.example.com/content-cms/published",
    }),
    {
      siteUrl: "https://saas.example.com/",
      cmsUrl: "https://api.saas.example.com/content-cms/published",
    },
  );
});
