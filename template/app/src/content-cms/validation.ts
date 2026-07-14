import * as z from "zod";
import { CMS_POST_STATUSES, type CmsSeoReadinessIssue } from "./types";

export const CMS_SLUG_MAX_LENGTH = 100;

export function normalizeCmsSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, CMS_SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
}

export function isValidCmsSlug(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= CMS_SLUG_MAX_LENGTH &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

const slugSourceSchema = z.string().trim().max(180).optional();

export const cmsPostWriteSchema = z.object({
  title: z.string().trim().min(1).max(180),
  slug: slugSourceSchema,
  excerpt: z.string().trim().max(320),
  content: z.string().trim().max(200_000),
  status: z.enum(CMS_POST_STATUSES),
  authorId: z.string().trim().min(1),
  tagIds: z.array(z.string().trim().min(1)).max(30).default([]),
  animationId: z.string().uuid().nullable().optional().default(null),
});

export const cmsPostUpdateSchema = cmsPostWriteSchema.extend({
  id: z.string().trim().min(1),
});

export const cmsPostFilterSchema = z.object({
  page: z.number().int().min(1).default(1),
  search: z.string().trim().max(180).optional(),
  status: z.enum(CMS_POST_STATUSES).optional(),
  authorId: z.string().trim().min(1).optional(),
  tagId: z.string().trim().min(1).optional(),
});

export const cmsTaxonomyCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: slugSourceSchema,
});

export const cmsAuthorCreateSchema = cmsTaxonomyCreateSchema.extend({
  bio: z.string().trim().max(1_000).optional().default(""),
});

export const cmsAuthorUpdateSchema = cmsAuthorCreateSchema.extend({
  id: z.string().trim().min(1),
});

export const cmsTagUpdateSchema = cmsTaxonomyCreateSchema.extend({
  id: z.string().trim().min(1),
});

export const cmsIdSchema = z.object({ id: z.string().trim().min(1) });

export type ParsedCmsPostWriteInput = z.infer<typeof cmsPostWriteSchema>;
export type CmsPostUpdateInput = z.infer<typeof cmsPostUpdateSchema>;
export type CmsPostFilterInput = z.infer<typeof cmsPostFilterSchema>;
export type CmsAuthorCreateInput = z.infer<typeof cmsAuthorCreateSchema>;
export type CmsAuthorUpdateInput = z.infer<typeof cmsAuthorUpdateSchema>;
export type CmsTagCreateInput = z.infer<typeof cmsTaxonomyCreateSchema>;
export type CmsTagUpdateInput = z.infer<typeof cmsTagUpdateSchema>;
export type CmsIdInput = z.infer<typeof cmsIdSchema>;

type CmsSeoCandidate = Pick<
  ParsedCmsPostWriteInput,
  "title" | "excerpt" | "content" | "authorId"
> &
  Partial<Pick<ParsedCmsPostWriteInput, "status">> & { slug: string };

export function getCmsSeoReadinessIssues(
  candidate: CmsSeoCandidate,
): CmsSeoReadinessIssue[] {
  const issues: CmsSeoReadinessIssue[] = [];
  const titleLength = candidate.title.trim().length;
  const excerptLength = candidate.excerpt.trim().length;
  const content = candidate.content.trim();

  if (titleLength === 0) {
    issues.push({
      code: "TITLE_MISSING",
      field: "title",
      message: "Add a descriptive title before publishing.",
    });
  } else if (titleLength < 10 || titleLength > 65) {
    issues.push({
      code: "TITLE_LENGTH",
      field: "title",
      message: "Keep the title between 10 and 65 characters.",
    });
  }

  if (excerptLength === 0) {
    issues.push({
      code: "EXCERPT_MISSING",
      field: "excerpt",
      message: "Add a search-result excerpt before publishing.",
    });
  } else if (excerptLength < 50 || excerptLength > 160) {
    issues.push({
      code: "EXCERPT_LENGTH",
      field: "excerpt",
      message: "Keep the excerpt between 50 and 160 characters.",
    });
  }

  if (content.length < 200) {
    issues.push({
      code: "CONTENT_TOO_SHORT",
      field: "content",
      message: "Add at least 200 characters of useful article content.",
    });
  }

  if (!candidate.authorId.trim()) {
    issues.push({
      code: "AUTHOR_MISSING",
      field: "authorId",
      message: "Assign an author before publishing.",
    });
  }

  if (!isValidCmsSlug(candidate.slug)) {
    issues.push({
      code: "SLUG_INVALID",
      field: "slug",
      message:
        "Use a non-empty lowercase slug with letters, numbers and hyphens.",
    });
  }

  if (/^#\s+/m.test(content) || /<h1(?:\s|>)/i.test(content)) {
    issues.push({
      code: "DUPLICATE_H1",
      field: "content",
      message:
        "Remove H1 headings from the body; the post title is the page H1.",
    });
  }

  const hasMarkdownH2 = /^\s{0,3}##\s+\S/m.test(content);
  const hasHtmlH2 = /<h2(?:\s|>)/i.test(content);
  if (!hasMarkdownH2 && !hasHtmlH2) {
    issues.push({
      code: "H2_MISSING",
      field: "content",
      message:
        "Add at least one H2 section heading so readers and search engines can scan the article structure.",
    });
  }

  if (!hasInternalContentLink(content)) {
    issues.push({
      code: "INTERNAL_LINK_MISSING",
      field: "content",
      message:
        "Add at least one relevant internal link to another MotionPress page or article.",
    });
  }

  const hasEmptyMarkdownAlt = /!\[\s*\]\([^)]+\)/.test(content);
  const hasHtmlImageWithoutAlt = /<img\b(?![^>]*\s+alt\s*=)[^>]*>/i.test(
    content,
  );
  const hasEmptyHtmlAlt = /<img\b[^>]*\s+alt\s*=\s*["']\s*["'][^>]*>/i.test(
    content,
  );
  if (hasEmptyMarkdownAlt || hasHtmlImageWithoutAlt || hasEmptyHtmlAlt) {
    issues.push({
      code: "IMAGE_ALT_MISSING",
      field: "content",
      message: "Add meaningful alt text to every image.",
    });
  }

  return issues;
}

function hasInternalContentLink(content: string): boolean {
  const hrefs: string[] = [];
  const markdownLinkPattern =
    /(?<!!)\[[^\]\n]+\]\(\s*<?([^\s)>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;
  const htmlLinkPattern = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;

  for (const match of content.matchAll(markdownLinkPattern)) {
    hrefs.push(match[1]);
  }
  for (const match of content.matchAll(htmlLinkPattern)) {
    hrefs.push(match[1]);
  }

  return hrefs.some((rawHref) => {
    const href = rawHref.trim();
    if (!href || href.startsWith("//")) return false;
    if (href.startsWith("/") || href.startsWith("./")) return true;
    if (href.startsWith("../") || href.startsWith("#")) return true;
    return !/^[a-z][a-z\d+.-]*:/i.test(href);
  });
}
