import assert from "node:assert/strict";
import test from "node:test";

import {
  createBlogStructuredData,
  serializeJsonLd,
} from "../src/lib/blogSeo.mjs";

test("serializeJsonLd keeps JSON-LD data from breaking out of its script tag", () => {
  const serialized = serializeJsonLd({
    headline: "</script><script>alert('xss')</script>",
    separator: "\u2028\u2029&",
  });

  assert.equal(serialized.includes("</script>"), false);
  assert.equal(serialized.includes("<script>"), false);
  assert.equal(serialized.includes("\u2028"), false);
  assert.equal(serialized.includes("\u2029"), false);
  assert.deepEqual(JSON.parse(serialized), {
    headline: "</script><script>alert('xss')</script>",
    separator: "\u2028\u2029&",
  });
});

test("createBlogStructuredData describes the article and its breadcrumb trail", () => {
  const data = createBlogStructuredData({
    canonicalUrl: "https://example.com/blog/launch/",
    blogUrl: "https://example.com/blog/",
    homeUrl: "https://example.com/",
    title: "A launch story",
    description: "How we launched a useful product.",
    imageUrl: "https://example.com/banner-images/launch.webp",
    publishedAt: "2026-07-01T00:00:00.000Z",
    modifiedAt: "2026-07-02T00:00:00.000Z",
    authors: ["Ada Lovelace"],
    tags: ["launch", "saas"],
    siteTitle: "Example SaaS",
  });

  assert.equal(data.length, 2);
  assert.equal(data[0]["@type"], "BlogPosting");
  assert.equal(
    data[0].mainEntityOfPage["@id"],
    "https://example.com/blog/launch/",
  );
  assert.deepEqual(data[0].author, [
    { "@type": "Person", name: "Ada Lovelace" },
  ]);
  assert.equal(data[1]["@type"], "BreadcrumbList");
  assert.equal(data[1].itemListElement.at(-1).name, "A launch story");
});
