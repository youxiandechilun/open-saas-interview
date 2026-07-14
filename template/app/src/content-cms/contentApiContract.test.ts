import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const spec = readFileSync(
  new URL("./content-cms.wasp.ts", import.meta.url),
  "utf8",
);
const operations = readFileSync(
  new URL("./operations.ts", import.meta.url),
  "utf8",
);
const contentApi = readFileSync(
  new URL("./contentApi.ts", import.meta.url),
  "utf8",
);

describe("published CMS content boundary", () => {
  it("exposes only the token-aware HTTP feed, never an unauthenticated Wasp query", () => {
    expect(spec).toContain('api("GET", "/content-cms/published"');
    expect(spec).not.toContain("query(getPublishedCmsPosts");
    expect(operations).not.toContain("export const getPublishedCmsPosts");
    expect(contentApi).toContain("CMS_CONTENT_API_TOKEN");
  });

  it("keeps the machine feed out of search results", () => {
    expect(contentApi).toContain(
      'res.setHeader("X-Robots-Tag", "noindex, nofollow")',
    );
  });
});
