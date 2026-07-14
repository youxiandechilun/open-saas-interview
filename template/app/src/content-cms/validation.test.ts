import { describe, expect, it } from "vitest";
import {
  CMS_SLUG_MAX_LENGTH,
  cmsPostWriteSchema,
  getCmsSeoReadinessIssues,
  isValidCmsSlug,
  normalizeCmsSlug,
} from "./validation";

const validPostInput = {
  title: "A practical guide to content operations",
  slug: "practical-content-operations",
  excerpt:
    "Learn how a small team can build a reliable content workflow without slowing down publication.",
  content: "Useful editorial guidance.",
  status: "DRAFT" as const,
  authorId: "author-1",
  tagIds: [],
};

describe("cmsPostWriteSchema", () => {
  it("defaults an omitted animation attachment to null", () => {
    expect(cmsPostWriteSchema.parse(validPostInput).animationId).toBeNull();
  });

  it("accepts an animation UUID", () => {
    const animationId = "f7b8e395-8658-4f1d-8f74-f38ca971c536";

    expect(
      cmsPostWriteSchema.parse({ ...validPostInput, animationId }).animationId,
    ).toBe(animationId);
  });

  it("rejects a malformed animation identifier", () => {
    expect(() =>
      cmsPostWriteSchema.parse({
        ...validPostInput,
        animationId: "not-an-animation-id",
      }),
    ).toThrow();
  });
});

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
    content: `## Start with ownership\n\nRead our [publishing guide](/blog/publishing-guide/).\n\n${"Useful editorial guidance. ".repeat(
      12,
    )}`,
    authorId: "author-1",
  };

  it("accepts a publishable post", () => {
    expect(getCmsSeoReadinessIssues(readyPost)).toEqual([]);
  });

  it("returns field-specific, actionable issues", () => {
    const issues = getCmsSeoReadinessIssues({
      ...readyPost,
      content:
        "# Duplicate page heading\n\n## Details\n\n[Read more](/blog/read-more/).\n\n![ ](/image.png)",
    });

    expect(issues.map(({ code }) => code)).toEqual([
      "CONTENT_TOO_SHORT",
      "DUPLICATE_H1",
      "IMAGE_ALT_MISSING",
    ]);
  });

  it("requires an H2 structure and a relevant internal link", () => {
    const issues = getCmsSeoReadinessIssues({
      ...readyPost,
      content: "A useful paragraph without structure or links. ".repeat(8),
    });

    expect(issues.map(({ code }) => code)).toEqual([
      "H2_MISSING",
      "INTERNAL_LINK_MISSING",
    ]);
  });

  it("accepts HTML H2 headings and relative HTML links", () => {
    const issues = getCmsSeoReadinessIssues({
      ...readyPost,
      content: `<h2>Workflow</h2><p><a href="../examples/">See examples</a></p>${"Useful guidance. ".repeat(
        15,
      )}`,
    });

    expect(issues).toEqual([]);
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
