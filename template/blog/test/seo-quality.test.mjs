import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSeoManifest,
  checkPostQuality,
  parseMarkdownDocument,
} from "../scripts/seo-quality.mjs";

const validPost = `---
title: A Practical Guide to Shipping a Reliable SaaS Feature
description: Learn how to design, test, and ship a reliable SaaS feature without adding avoidable operational risk.
date: 2026-07-01
tags: ["saas", "testing"]
authors: ["Dev"]
---

## Start with the user outcome

Read the [introduction](/) before continuing.

![A release checklist with completed steps](/release-checklist.png)
`;

test("quality checker accepts framework SEO and a well-formed post", () => {
  const document = parseMarkdownDocument(validPost, "blog/reliable-feature.md");
  const report = checkPostQuality(document, {
    knownRoutes: new Set(["/", "/blog/reliable-feature/"]),
    frameworkCanonical: true,
    frameworkH1: true,
  });

  assert.deepEqual(
    report.issues.filter((issue) => issue.severity === "error"),
    [],
  );
  assert.equal(report.metrics.canonicalSource, "framework");
  assert.equal(report.metrics.h1Count, 1);
  assert.equal(report.metrics.h2Count, 1);
  assert.equal(report.metrics.imagesWithoutAlt, 0);
  assert.equal(report.metrics.internalLinkCount, 1);
});

test("quality checker gives actionable findings for every requested SEO signal", () => {
  const document = parseMarkdownDocument(
    `---
title: Tiny
---

# Duplicate title

![](/missing-image.png)

[Broken route](/does-not-exist/)
`,
    "blog/broken.md",
  );
  const report = checkPostQuality(document, {
    knownRoutes: new Set(["/", "/blog/broken/"]),
    frameworkCanonical: false,
    frameworkH1: true,
  });
  const rules = new Set(report.issues.map((issue) => issue.rule));

  for (const rule of [
    "title-length",
    "description",
    "publication-date",
    "h1",
    "h2",
    "canonical",
    "image-alt",
    "internal-link",
  ]) {
    assert.equal(rules.has(rule), true, `expected a ${rule} finding`);
  }
  assert.equal(
    report.issues.every((issue) => issue.suggestion.length > 0),
    true,
  );
});

test("quality checker counts HTML headings as well as Markdown headings", () => {
  const document = parseMarkdownDocument(
    validPost.replace(
      "## Start with the user outcome",
      "<h1>Duplicate</h1>\n<h2>Outcome</h2>",
    ),
    "blog/html-headings.md",
  );
  const report = checkPostQuality(document, {
    knownRoutes: new Set(["/", "/blog/html-headings/"]),
    frameworkCanonical: true,
    frameworkH1: true,
  });

  assert.equal(report.metrics.h1Count, 2);
  assert.equal(report.metrics.h2Count, 1);
  assert.equal(
    report.issues.some((issue) => issue.rule === "h1"),
    true,
  );
  assert.equal(
    report.issues.some((issue) => issue.rule === "h2"),
    false,
  );
});

test("quality checker validates HTML internal links", () => {
  const document = parseMarkdownDocument(
    validPost.replace(
      "Read the [introduction](/) before continuing.",
      '<a href="/guides/missing/">Missing guide</a>',
    ),
    "blog/html-links.md",
  );
  const report = checkPostQuality(document, {
    knownRoutes: new Set(["/", "/blog/html-links/"]),
    frameworkCanonical: true,
    frameworkH1: true,
  });

  assert.equal(report.metrics.internalLinkCount, 1);
  assert.equal(
    report.issues.some(
      (issue) => issue.rule === "internal-link" && issue.severity === "error",
    ),
    true,
  );
});

test("SEO manifest contains only published posts and canonical build metadata", () => {
  const published = parseMarkdownDocument(
    validPost,
    "blog/reliable-feature.md",
  );
  const draft = parseMarkdownDocument(
    validPost.replace("date: 2026-07-01", "date: 2026-07-02\ndraft: TRUE"),
    "blog/draft.md",
  );

  const manifest = buildSeoManifest([published, draft], {
    siteUrl: "https://example.com/base/",
  });

  assert.equal(manifest.posts.length, 1);
  assert.equal(
    manifest.posts[0].canonical,
    "https://example.com/blog/reliable-feature/",
  );
  assert.deepEqual(manifest.posts[0].tags, ["saas", "testing"]);
  assert.equal(manifest.posts[0].publishedAt, "2026-07-01T00:00:00.000Z");
});
