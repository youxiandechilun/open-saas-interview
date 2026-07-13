export const CMS_POST_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export type CmsPostStatusValue = (typeof CMS_POST_STATUSES)[number];

export type CmsAuthorSummary = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  postCount: number;
};

export type CmsTagSummary = {
  id: string;
  name: string;
  slug: string;
  postCount: number;
};

export type CmsPostListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: CmsPostStatusValue;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: Pick<CmsAuthorSummary, "id" | "name" | "slug" | "bio"> & {
    updatedAt: Date;
  };
  tags: Array<
    Pick<CmsTagSummary, "id" | "name" | "slug"> & { updatedAt: Date }
  >;
};

export type CmsPostPage = {
  items: CmsPostListItem[];
  total: number;
  totalPages: number;
};

export type CmsTaxonomy = {
  authors: CmsAuthorSummary[];
  tags: CmsTagSummary[];
};

export type CmsPostWriteInput = {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  status: CmsPostStatusValue;
  authorId: string;
  tagIds: string[];
};

export type CmsSeoIssueCode =
  | "TITLE_MISSING"
  | "TITLE_LENGTH"
  | "EXCERPT_MISSING"
  | "EXCERPT_LENGTH"
  | "CONTENT_TOO_SHORT"
  | "AUTHOR_MISSING"
  | "SLUG_INVALID"
  | "DUPLICATE_H1"
  | "IMAGE_ALT_MISSING";

export type CmsSeoReadinessIssue = {
  code: CmsSeoIssueCode;
  field: "title" | "slug" | "excerpt" | "content" | "authorId";
  message: string;
};

export type PublishedCmsPost = CmsPostListItem & {
  canonicalPath: string;
};

export type PublishedCmsFeed = {
  contentVersion: string;
  updatedAt: Date | null;
  posts: PublishedCmsPost[];
};
