import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new globalThis.URL("../", import.meta.url));
const dist = path.join(root, "dist");

const [robots, sitemapIndex, sitemap, manifest] = await Promise.all([
  readFile(path.join(dist, "robots.txt"), "utf8"),
  readFile(path.join(dist, "sitemap-index.xml"), "utf8"),
  readFile(path.join(dist, "sitemap-0.xml"), "utf8"),
  readFile(path.join(dist, "blog-seo-manifest.json"), "utf8").then(JSON.parse),
]);

assert.match(robots, /^User-agent: \*/m);
assert.match(robots, /Sitemap: https:\/\/[^\s]+\/sitemap-index\.xml/);
assert.match(sitemapIndex, /<sitemapindex/);
assert.equal(
  manifest.posts.some((post) => post.route === "/blog/2023-11-23-post/"),
  true,
);

for (const post of manifest.posts) {
  const postHtml = await readFile(
    path.join(dist, ...post.route.split("/").filter(Boolean), "index.html"),
    "utf8",
  );
  const canonicalTags =
    postHtml.match(/<link\b[^>]*rel="canonical"[^>]*>/g) ?? [];
  assert.equal(
    canonicalTags.length,
    1,
    `${post.route} must render exactly one canonical link`,
  );
  assert.equal(
    canonicalTags[0].includes(`href="${post.canonical}"`),
    true,
    `${post.route} canonical must match the SEO manifest`,
  );
  assert.equal(
    sitemap.includes(`<loc>${post.canonical}</loc>`),
    true,
    `${post.route} must appear in the generated sitemap`,
  );
  assert.match(postHtml, /property="article:published_time"/);
  assert.match(postHtml, /name="twitter:title"/);
  assert.match(postHtml, /type="application\/ld\+json"/);
  assert.match(postHtml, /"@type":"BlogPosting"/);
  assert.match(postHtml, /"@type":"BreadcrumbList"/);
}

console.log(
  "Build assertions: robots, sitemap, metadata, JSON-LD, and SEO manifest verified.",
);
