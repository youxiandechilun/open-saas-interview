export const CMS_POST_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export type CmsPostStatusValue = (typeof CMS_POST_STATUSES)[number];

export type CmsPublicationEventSummary = {
  id: string;
  eventType: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  processedAt: Date | null;
};

export type CmsPublicationTaskStatus =
  | "PENDING"
  | "PROCESSING"
  | "FAILED"
  | "DISABLED";

export type CmsPublicationTaskSummary = {
  eventId: string;
  postId: string;
  eventType: string;
  slug: string | null;
  status: CmsPublicationTaskStatus;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

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

export type CmsAnimationSummary = {
  id: string;
  title: string;
  description: string | null;
  ownerLabel: string | null;
  status: "READY" | "FAILED";
  videoStatus:
    | "NOT_REQUESTED"
    | "QUEUED"
    | "PROCESSING"
    | "SUCCEEDED"
    | "FAILED";
  videoFormat: string | null;
  videoMimeType: string | null;
  createdAt: Date;
  updatedAt: Date;
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
  animation: CmsAnimationSummary | null;
  latestPublicationEvent?: CmsPublicationEventSummary | null;
};

export type CmsPostPage = {
  items: CmsPostListItem[];
  total: number;
  totalPages: number;
};

export type CmsTaxonomy = {
  authors: CmsAuthorSummary[];
  tags: CmsTagSummary[];
  animations: CmsAnimationSummary[];
};

export type CmsPostWriteInput = {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  status: CmsPostStatusValue;
  authorId: string;
  tagIds: string[];
  animationId: string | null;
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
  | "H2_MISSING"
  | "INTERNAL_LINK_MISSING"
  | "IMAGE_ALT_MISSING";

export type CmsSeoReadinessIssue = {
  code: CmsSeoIssueCode;
  field: "title" | "slug" | "excerpt" | "content" | "authorId";
  message: string;
};

export type PublishedCmsAnimation = Omit<CmsAnimationSummary, "ownerLabel"> & {
  publicMediaPath: string | null;
};

export type PublishedCmsPost = Omit<CmsPostListItem, "animation"> & {
  animation: PublishedCmsAnimation | null;
  canonicalPath: string;
};

export type PublishedCmsFeed = {
  contentVersion: string;
  updatedAt: Date | null;
  posts: PublishedCmsPost[];
};
