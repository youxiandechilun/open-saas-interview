import { describe, expect, it } from "vitest";
import {
  CMS_SLUG_MAX_LENGTH,
  getCmsSeoReadinessIssues,
  isValidCmsSlug,
  normalizeCmsSlug,
} from "./validation";

describe("normalizeCmsSlug", () => {
  it("normalizes punctuation, accents, whitespace and ampersands", () => {
    expect(normalizeCmsSlug("  Caf\u00e9 & Product Updates!  ")).toBe(
      "cafe-and-product-updates",
    );
  });

  it("trims the result without leaving a trailing separator", () => {
    const result = normalizeCmsSlug(`${"a".repeat(99)} news`);

    expect(result.length).toBeLessThanOrEqual(CMS_SLUG_MAX_LENGTH);
    expect(result.endsWith("-")).toBe(false);
  });
});

describe("getCmsSeoReadinessIssues", () => {
  const readyPost = {
    title: "A practical guide to content operations",
    slug: "practical-content-operations",
    excerpt:
      "Learn how a small team can build a reliable content workflow without slowing down publication.",
    content: `## Start with ownership\n\n${"Useful editorial guidance. ".repeat(12)}`,
    authorId: "author-1",
  };

  it("accepts a publishable post", () => {
    expect(getCmsSeoReadinessIssues(readyPost)).toEqual([]);
  });

  it("returns field-specific, actionable issues", () => {
    const issues = getCmsSeoReadinessIssues({
      ...readyPost,
      content: "# Duplicate page heading\n\n![ ](/image.png)",
    });

    expect(issues.map(({ code }) => code)).toEqual([
      "CONTENT_TOO_SHORT",
      "DUPLICATE_H1",
      "IMAGE_ALT_MISSING",
    ]);
  });

  it("does not mistake data-alt for an image alt attribute", () => {
    const issues = getCmsSeoReadinessIssues({
      ...readyPost,
      content: `${readyPost.content}\n<img data-alt="caption" src="/image.png">`,
    });

    expect(issues.map(({ code }) => code)).toContain("IMAGE_ALT_MISSING");
  });
});

describe("isValidCmsSlug", () => {
  it.each(["product-update", "v2-release", "2026-roadmap"])(
    "accepts %s",
    (slug) => expect(isValidCmsSlug(slug)).toBe(true),
  );

  it.each(["", "Uppercase", "two--dashes", "ends-"])("rejects %s", (slug) =>
    expect(isValidCmsSlug(slug)).toBe(false),
  );
});
