import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { env, HttpError, prisma } from "wasp/server";
import {
  type CreateCmsAuthor,
  type CreateCmsPost,
  type CreateCmsTag,
  type DeleteCmsAuthor,
  type DeleteCmsPost,
  type DeleteCmsTag,
  type GetCmsPosts,
  type GetCmsPublicationTasks,
  type GetCmsTaxonomy,
  type UpdateCmsAuthor,
  type UpdateCmsPost,
  type UpdateCmsTag,
} from "wasp/server/operations";
import { validateSucceededVideoAsset } from "../ai-studio/server/videoAsset";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import {
  canAttachCmsAnimation,
  getCmsAnimationOwnerLabel,
  shouldValidateCmsAnimationChange,
} from "./animationPolicy";
import { sanitizeCmsMarkdown } from "./contentSecurity";
import { canManageCms } from "./permissions";
import {
  getPublicationInitialState,
  getPublicationWebhookConfig,
  isRetryablePublicationStatus,
} from "./publicationPolicy";
import {
  CMS_PUBLICATION_TASK_STATUSES,
  toCmsPublicationTask,
} from "./publicationTask";
import { getCmsPublicMediaDescriptor } from "./publicMedia";
import {
  type CmsAnimationSummary,
  type CmsPostListItem,
  type CmsPostPage,
  type CmsPublicationTaskSummary,
  type CmsTaxonomy,
  type PublishedCmsAnimation,
  type PublishedCmsFeed,
} from "./types";
import {
  cmsAuthorCreateSchema,
  cmsAuthorUpdateSchema,
  cmsIdSchema,
  cmsPostFilterSchema,
  cmsPostUpdateSchema,
  cmsPostWriteSchema,
  cmsTagUpdateSchema,
  cmsTaxonomyCreateSchema,
  getCmsSeoReadinessIssues,
  isValidCmsSlug,
  normalizeCmsSlug,
  type CmsAuthorCreateInput,
  type CmsAuthorUpdateInput,
  type CmsIdInput,
  type CmsPostFilterInput,
  type CmsPostUpdateInput,
  type CmsTagCreateInput,
  type CmsTagUpdateInput,
  type ParsedCmsPostWriteInput,
} from "./validation";

const CMS_PAGE_SIZE = 20;

type CmsContext = { user?: { id: string } | null };

async function requireCmsEditor(context: CmsContext) {
  if (!context.user) {
    throw new HttpError(401, "Authentication is required.");
  }
  const currentUser = await prisma.user.findUnique({
    where: { id: context.user.id },
    select: { id: true, role: true, isAdmin: true, isDisabled: true },
  });
  if (!currentUser || !canManageCms(currentUser)) {
    throw new HttpError(403, "Editor or administrator access is required.");
  }
  return currentUser;
}

function resolveSlug(slug: string | undefined, fallback: string): string {
  const normalized = normalizeCmsSlug(slug?.trim() || fallback);
  if (!isValidCmsSlug(normalized)) {
    throw new HttpError(
      400,
      "The slug must contain at least one letter or number and may only use lowercase letters, numbers and hyphens.",
    );
  }
  return normalized;
}

async function ensureUniqueSlug(
  label: string,
  slug: string,
  findConflict: () => Promise<unknown>,
) {
  if (await findConflict()) {
    throw new HttpError(
      409,
      `A ${label} with the slug "${slug}" already exists.`,
    );
  }
}

function mapCmsWriteError(error: unknown): never {
  if (error instanceof HttpError) {
    throw error;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new HttpError(409, "That slug is already in use.");
    }
    if (error.code === "P2025") {
      throw new HttpError(404, "The requested CMS record was not found.");
    }
  }
  throw error;
}

async function assertRelationsExist(authorId: string, tagIds: string[]) {
  const uniqueTagIds = [...new Set(tagIds)];
  const [author, tagCount] = await Promise.all([
    prisma.cmsAuthor.findUnique({
      where: { id: authorId },
      select: { id: true },
    }),
    prisma.cmsTag.count({ where: { id: { in: uniqueTagIds } } }),
  ]);

  if (!author) {
    throw new HttpError(400, "Select an existing author.");
  }
  if (tagCount !== uniqueTagIds.length) {
    throw new HttpError(400, "One or more selected tags no longer exist.");
  }
  return uniqueTagIds;
}

async function assertAttachableAnimation(
  animationId: string,
  actor: Awaited<ReturnType<typeof requireCmsEditor>>,
) {
  const animation = await prisma.aiAnimation.findUnique({
    where: { id: animationId },
    select: {
      id: true,
      userId: true,
      status: true,
      videoStatus: true,
      videoFormat: true,
      videoMimeType: true,
      videoStoragePath: true,
      user: { select: { isDisabled: true } },
    },
  });
  if (!animation || !canAttachCmsAnimation(actor, animation)) {
    throw new HttpError(
      400,
      "Select a publishable video from an active teammate's animation library.",
    );
  }
  const storedVideo = await validateSucceededVideoAsset({
    asset: animation,
    invalidate: (cas) => prisma.aiAnimation.updateMany(cas),
  });
  if (storedVideo.state !== "valid") {
    throw new HttpError(
      409,
      "The selected video file is unavailable or unsafe; render it again before attaching or publishing.",
    );
  }
}

function assertPublishable(input: ParsedCmsPostWriteInput, slug: string) {
  if (input.status !== "PUBLISHED") return;
  const issues = getCmsSeoReadinessIssues({ ...input, slug });
  if (issues.length > 0) {
    throw new HttpError(
      422,
      "Resolve the SEO readiness issues before publishing.",
      {
        issues,
      },
    );
  }
}

const postSelection = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: { id: true, name: true, slug: true, bio: true, updatedAt: true },
  },
  tags: {
    select: { id: true, name: true, slug: true, updatedAt: true },
    orderBy: { name: "asc" },
  },
  animation: {
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      videoStatus: true,
      videoFormat: true,
      videoMimeType: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { username: true, email: true } },
    },
  },
} satisfies Prisma.CmsPostSelect;

type SelectedCmsPost = Prisma.CmsPostGetPayload<{
  select: typeof postSelection;
}>;

function toCmsAnimationSummary(
  animation: NonNullable<SelectedCmsPost["animation"]>,
): CmsAnimationSummary {
  const { user, ...summary } = animation;
  return { ...summary, ownerLabel: getCmsAnimationOwnerLabel(user) };
}

function toPublishedCmsAnimation(
  animation: NonNullable<SelectedCmsPost["animation"]>,
): PublishedCmsAnimation {
  return {
    id: animation.id,
    title: animation.title,
    description: animation.description,
    status: animation.status,
    videoStatus: animation.videoStatus,
    videoFormat: animation.videoFormat,
    videoMimeType: animation.videoMimeType,
    createdAt: animation.createdAt,
    updatedAt: animation.updatedAt,
    publicMediaPath: getCmsPublicMediaDescriptor(animation)?.path ?? null,
  };
}

function toCmsPostListItem(post: SelectedCmsPost): CmsPostListItem {
  return {
    ...post,
    animation: post.animation ? toCmsAnimationSummary(post.animation) : null,
  };
}

function computePublishedFeedVersion(posts: SelectedCmsPost[]) {
  const canonicalContent = posts
    .map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: sanitizeCmsMarkdown(post.content),
      publishedAt: post.publishedAt?.toISOString() ?? null,
      updatedAt: post.updatedAt.toISOString(),
      author: post.author,
      tags: [...post.tags].sort((left, right) =>
        left.id.localeCompare(right.id),
      ),
      animation: post.animation
        ? toPublishedCmsAnimation(post.animation)
        : null,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  return createHash("sha256")
    .update(JSON.stringify(canonicalContent))
    .digest("hex")
    .slice(0, 24);
}

async function enqueuePublicationEvent(
  tx: Prisma.TransactionClient,
  input: {
    postId: string;
    slug: string;
    eventType:
      | "PUBLISHED"
      | "CONTENT_UPDATED"
      | "UNPUBLISHED"
      | "DELETED"
      | "TAXONOMY_UPDATED";
  },
) {
  const feedPosts = await tx.cmsPost.findMany({
    where: { status: "PUBLISHED" },
    select: postSelection,
  });
  const contentVersion = computePublishedFeedVersion(feedPosts);
  const duplicate = await tx.cmsPublicationEvent.findFirst({
    where: {
      contentVersion,
      status: { in: ["PENDING", "PROCESSING", "DISABLED"] },
    },
    select: { id: true },
  });
  if (duplicate) return;

  const publicationState = getPublicationInitialState(
    env.CMS_REBUILD_WEBHOOK_URL,
    env.CMS_REBUILD_WEBHOOK_TOKEN,
  );
  await tx.cmsPublicationEvent.create({
    data: {
      postId: input.postId,
      eventType: input.eventType,
      contentVersion,
      payload: {
        postId: input.postId,
        slug: input.slug,
        eventType: input.eventType,
        contentVersion,
      },
      status: publicationState.status,
      lastError: publicationState.lastError,
    },
  });
}

export const getCmsPosts: GetCmsPosts<CmsPostFilterInput, CmsPostPage> = async (
  rawArgs,
  context,
) => {
  await requireCmsEditor(context);
  const { page, search, status, authorId, tagId } =
    ensureArgsSchemaOrThrowHttpError(cmsPostFilterSchema, rawArgs);
  const where: Prisma.CmsPostWhereInput = {
    status,
    authorId,
    ...(tagId && { tags: { some: { id: tagId } } }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { excerpt: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.cmsPost.findMany({
      where,
      select: postSelection,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * CMS_PAGE_SIZE,
      take: CMS_PAGE_SIZE,
    }),
    prisma.cmsPost.count({ where }),
  ]);
  const publicationEvents = items.length
    ? await prisma.cmsPublicationEvent.findMany({
        where: { postId: { in: items.map(({ id }) => id) } },
        select: {
          id: true,
          postId: true,
          eventType: true,
          status: true,
          attempts: true,
          lastError: true,
          createdAt: true,
          updatedAt: true,
          processedAt: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      })
    : [];
  const latestPublicationByPostId = new Map<
    string,
    (typeof publicationEvents)[number]
  >();
  for (const event of publicationEvents) {
    if (!latestPublicationByPostId.has(event.postId)) {
      latestPublicationByPostId.set(event.postId, event);
    }
  }

  return {
    items: items.map((post) => {
      const event = latestPublicationByPostId.get(post.id);
      const item = toCmsPostListItem(post);
      if (!event) return { ...item, latestPublicationEvent: null };
      return {
        ...item,
        latestPublicationEvent: {
          id: event.id,
          eventType: event.eventType,
          status: event.status,
          attempts: event.attempts,
          lastError: event.lastError,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
          processedAt: event.processedAt,
        },
      };
    }) as CmsPostPage["items"],
    total,
    totalPages: Math.max(1, Math.ceil(total / CMS_PAGE_SIZE)),
  };
};

export async function readPublishedCmsFeed(): Promise<PublishedCmsFeed> {
  const posts = await prisma.cmsPost.findMany({
    where: { status: "PUBLISHED" },
    select: postSelection,
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
  });
  const updatedAt = posts.reduce<Date | null>((latest, post) => {
    const candidates = [
      post.updatedAt,
      post.author.updatedAt,
      ...post.tags.map((tag) => tag.updatedAt),
      ...(post.animation ? [post.animation.updatedAt] : []),
    ];
    return candidates.reduce(
      (current, candidate) =>
        !current || candidate > current ? candidate : current,
      latest,
    );
  }, null);
  const contentVersion = computePublishedFeedVersion(posts);

  return {
    contentVersion,
    updatedAt,
    posts: posts.map((post) => ({
      ...post,
      content: sanitizeCmsMarkdown(post.content),
      animation: post.animation
        ? toPublishedCmsAnimation(post.animation)
        : null,
      canonicalPath: `/blog/${post.slug}/`,
    })),
  };
}

export const getCmsPublicationTasks: GetCmsPublicationTasks<
  void,
  CmsPublicationTaskSummary[]
> = async (_args, context) => {
  await requireCmsEditor(context);
  const events = await prisma.cmsPublicationEvent.findMany({
    where: {
      status: { in: [...CMS_PUBLICATION_TASK_STATUSES] },
    },
    select: {
      id: true,
      postId: true,
      eventType: true,
      payload: true,
      status: true,
      attempts: true,
      lastError: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 50,
  });

  return events
    .map(toCmsPublicationTask)
    .filter((task): task is CmsPublicationTaskSummary => task !== null);
};

export async function retryCmsPublicationEvent(
  rawArgs: unknown,
  context: CmsContext,
) {
  await requireCmsEditor(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(cmsIdSchema, rawArgs);
  if (
    !getPublicationWebhookConfig(
      env.CMS_REBUILD_WEBHOOK_URL,
      env.CMS_REBUILD_WEBHOOK_TOKEN,
    )
  ) {
    throw new HttpError(
      409,
      "Configure the publishing webhook URL and token before retrying this event.",
    );
  }

  const retried = await prisma.cmsPublicationEvent.updateMany({
    where: { id, status: { in: ["FAILED", "DISABLED"] } },
    data: {
      status: "PENDING",
      attempts: 0,
      availableAt: new Date(),
      lastError: null,
      processedAt: null,
    },
  });
  if (retried.count === 0) {
    const exists = await prisma.cmsPublicationEvent.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!exists) throw new HttpError(404, "Publication event not found.");
    if (!isRetryablePublicationStatus(exists.status)) {
      throw new HttpError(409, "This publication event is not retryable.");
    }
    throw new HttpError(409, "Publication state changed. Refresh and retry.");
  }

  return prisma.cmsPublicationEvent.findUniqueOrThrow({ where: { id } });
}

export const getCmsTaxonomy: GetCmsTaxonomy<void, CmsTaxonomy> = async (
  _args,
  context,
) => {
  await requireCmsEditor(context);
  const [authors, tags, animations] = await Promise.all([
    prisma.cmsAuthor.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        bio: true,
        _count: { select: { posts: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.cmsTag.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { posts: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.aiAnimation.findMany({
      where: { status: "READY", user: { isDisabled: false } },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        videoStatus: true,
        videoFormat: true,
        videoMimeType: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { username: true, email: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 50,
    }),
  ]);

  return {
    authors: authors.map(({ _count, ...author }) => ({
      ...author,
      postCount: _count.posts,
    })),
    tags: tags.map(({ _count, ...tag }) => ({
      ...tag,
      postCount: _count.posts,
    })),
    animations: animations.map(({ user: owner, ...animation }) => ({
      ...animation,
      ownerLabel: getCmsAnimationOwnerLabel(owner),
    })),
  };
};

export const createCmsPost: CreateCmsPost<
  ParsedCmsPostWriteInput,
  CmsPostPage["items"][number]
> = async (rawArgs, context) => {
  const user = await requireCmsEditor(context);
  const parsedInput = ensureArgsSchemaOrThrowHttpError(
    cmsPostWriteSchema,
    rawArgs,
  );
  const input = {
    ...parsedInput,
    content: sanitizeCmsMarkdown(parsedInput.content),
  };
  const slug = resolveSlug(input.slug, input.title);
  await ensureUniqueSlug("post", slug, () =>
    prisma.cmsPost.findUnique({ where: { slug }, select: { id: true } }),
  );
  const tagIds = await assertRelationsExist(input.authorId, input.tagIds);
  if (input.animationId) {
    await assertAttachableAnimation(input.animationId, user);
  }
  assertPublishable(input, slug);

  try {
    return (await prisma.$transaction(async (tx) => {
      const post = await tx.cmsPost.create({
        data: {
          title: input.title,
          slug,
          excerpt: input.excerpt,
          content: input.content,
          status: input.status,
          publishedAt: input.status === "PUBLISHED" ? new Date() : null,
          createdById: user.id,
          authorId: input.authorId,
          animationId: input.animationId,
          tags: { connect: tagIds.map((id) => ({ id })) },
        },
        select: postSelection,
      });
      if (post.status === "PUBLISHED") {
        await enqueuePublicationEvent(tx, {
          postId: post.id,
          slug: post.slug,
          eventType: "PUBLISHED",
        });
      }
      return toCmsPostListItem(post);
    })) as CmsPostPage["items"][number];
  } catch (error) {
    return mapCmsWriteError(error);
  }
};

export const updateCmsPost: UpdateCmsPost<
  CmsPostUpdateInput,
  CmsPostPage["items"][number]
> = async (rawArgs, context) => {
  const user = await requireCmsEditor(context);
  const parsedInput = ensureArgsSchemaOrThrowHttpError(
    cmsPostUpdateSchema,
    rawArgs,
  );
  const input = {
    ...parsedInput,
    content: sanitizeCmsMarkdown(parsedInput.content),
  };
  const existing = await prisma.cmsPost.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      status: true,
      publishedAt: true,
      animationId: true,
    },
  });
  if (!existing) throw new HttpError(404, "Post not found.");

  const slug = resolveSlug(input.slug, input.title);
  await ensureUniqueSlug("post", slug, () =>
    prisma.cmsPost.findFirst({
      where: { slug, NOT: { id: input.id } },
      select: { id: true },
    }),
  );
  const tagIds = await assertRelationsExist(input.authorId, input.tagIds);
  if (
    input.animationId &&
    (input.status === "PUBLISHED" ||
      shouldValidateCmsAnimationChange(existing.animationId, input.animationId))
  ) {
    await assertAttachableAnimation(input.animationId, user);
  }
  assertPublishable(input, slug);

  try {
    return (await prisma.$transaction(async (tx) => {
      const post = await tx.cmsPost.update({
        where: { id: input.id },
        data: {
          title: input.title,
          slug,
          excerpt: input.excerpt,
          content: input.content,
          status: input.status,
          publishedAt:
            input.status === "PUBLISHED"
              ? existing.publishedAt ?? new Date()
              : input.status === "DRAFT"
                ? null
                : existing.publishedAt,
          authorId: input.authorId,
          animationId: input.animationId,
          tags: { set: tagIds.map((id) => ({ id })) },
        },
        select: postSelection,
      });
      if (post.status === "PUBLISHED") {
        await enqueuePublicationEvent(tx, {
          postId: post.id,
          slug: post.slug,
          eventType:
            existing.status === "PUBLISHED" ? "CONTENT_UPDATED" : "PUBLISHED",
        });
      } else if (existing.status === "PUBLISHED") {
        await enqueuePublicationEvent(tx, {
          postId: post.id,
          slug: post.slug,
          eventType: "UNPUBLISHED",
        });
      }
      return toCmsPostListItem(post);
    })) as CmsPostPage["items"][number];
  } catch (error) {
    return mapCmsWriteError(error);
  }
};

export const deleteCmsPost: DeleteCmsPost<CmsIdInput, { id: string }> = async (
  rawArgs,
  context,
) => {
  await requireCmsEditor(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(cmsIdSchema, rawArgs);
  try {
    await prisma.$transaction(async (tx) => {
      const post = await tx.cmsPost.findUnique({
        where: { id },
        select: { id: true, slug: true, status: true },
      });
      if (!post) throw new HttpError(404, "Post not found.");
      await tx.cmsPost.delete({ where: { id } });
      if (post.status === "PUBLISHED") {
        // The outbox postId intentionally has no foreign key. Enqueue after
        // deletion so the version reflects removal; a write failure rolls back both.
        await enqueuePublicationEvent(tx, {
          postId: post.id,
          slug: post.slug,
          eventType: "DELETED",
        });
      }
    });
    return { id };
  } catch (error) {
    return mapCmsWriteError(error);
  }
};

export const createCmsAuthor: CreateCmsAuthor<
  CmsAuthorCreateInput,
  CmsTaxonomy["authors"][number]
> = async (rawArgs, context) => {
  await requireCmsEditor(context);
  const input = ensureArgsSchemaOrThrowHttpError(
    cmsAuthorCreateSchema,
    rawArgs,
  );
  const slug = resolveSlug(input.slug, input.name);
  await ensureUniqueSlug("author", slug, () =>
    prisma.cmsAuthor.findUnique({ where: { slug }, select: { id: true } }),
  );
  try {
    const author = await prisma.cmsAuthor.create({
      data: { name: input.name, slug, bio: input.bio || null },
    });
    return { ...author, postCount: 0 };
  } catch (error) {
    return mapCmsWriteError(error);
  }
};

export const updateCmsAuthor: UpdateCmsAuthor<
  CmsAuthorUpdateInput,
  CmsTaxonomy["authors"][number]
> = async (rawArgs, context) => {
  await requireCmsEditor(context);
  const input = ensureArgsSchemaOrThrowHttpError(
    cmsAuthorUpdateSchema,
    rawArgs,
  );
  const slug = resolveSlug(input.slug, input.name);
  await ensureUniqueSlug("author", slug, () =>
    prisma.cmsAuthor.findFirst({
      where: { slug, NOT: { id: input.id } },
      select: { id: true },
    }),
  );
  try {
    return await prisma.$transaction(async (tx) => {
      const affectedPost = await tx.cmsPost.findFirst({
        where: { authorId: input.id, status: "PUBLISHED" },
        select: { id: true, slug: true },
      });
      const author = await tx.cmsAuthor.update({
        where: { id: input.id },
        data: { name: input.name, slug, bio: input.bio || null },
        include: { _count: { select: { posts: true } } },
      });
      if (affectedPost) {
        await enqueuePublicationEvent(tx, {
          postId: affectedPost.id,
          slug: affectedPost.slug,
          eventType: "TAXONOMY_UPDATED",
        });
      }
      const { _count, ...result } = author;
      return { ...result, postCount: _count.posts };
    });
  } catch (error) {
    return mapCmsWriteError(error);
  }
};

export const deleteCmsAuthor: DeleteCmsAuthor<
  CmsIdInput,
  { id: string }
> = async (rawArgs, context) => {
  await requireCmsEditor(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(cmsIdSchema, rawArgs);
  const posts = await prisma.cmsPost.count({ where: { authorId: id } });
  if (posts > 0) {
    throw new HttpError(
      409,
      "Reassign this author's posts before deleting them.",
    );
  }
  try {
    await prisma.cmsAuthor.delete({ where: { id } });
    return { id };
  } catch (error) {
    return mapCmsWriteError(error);
  }
};

export const createCmsTag: CreateCmsTag<
  CmsTagCreateInput,
  CmsTaxonomy["tags"][number]
> = async (rawArgs, context) => {
  await requireCmsEditor(context);
  const input = ensureArgsSchemaOrThrowHttpError(
    cmsTaxonomyCreateSchema,
    rawArgs,
  );
  const slug = resolveSlug(input.slug, input.name);
  await ensureUniqueSlug("tag", slug, () =>
    prisma.cmsTag.findUnique({ where: { slug }, select: { id: true } }),
  );
  try {
    const tag = await prisma.cmsTag.create({
      data: { name: input.name, slug },
    });
    return { ...tag, postCount: 0 };
  } catch (error) {
    return mapCmsWriteError(error);
  }
};

export const updateCmsTag: UpdateCmsTag<
  CmsTagUpdateInput,
  CmsTaxonomy["tags"][number]
> = async (rawArgs, context) => {
  await requireCmsEditor(context);
  const input = ensureArgsSchemaOrThrowHttpError(cmsTagUpdateSchema, rawArgs);
  const slug = resolveSlug(input.slug, input.name);
  await ensureUniqueSlug("tag", slug, () =>
    prisma.cmsTag.findFirst({
      where: { slug, NOT: { id: input.id } },
      select: { id: true },
    }),
  );
  try {
    return await prisma.$transaction(async (tx) => {
      const affectedPost = await tx.cmsPost.findFirst({
        where: { status: "PUBLISHED", tags: { some: { id: input.id } } },
        select: { id: true, slug: true },
      });
      const tag = await tx.cmsTag.update({
        where: { id: input.id },
        data: { name: input.name, slug },
        include: { _count: { select: { posts: true } } },
      });
      if (affectedPost) {
        await enqueuePublicationEvent(tx, {
          postId: affectedPost.id,
          slug: affectedPost.slug,
          eventType: "TAXONOMY_UPDATED",
        });
      }
      const { _count, ...result } = tag;
      return { ...result, postCount: _count.posts };
    });
  } catch (error) {
    return mapCmsWriteError(error);
  }
};

export const deleteCmsTag: DeleteCmsTag<CmsIdInput, { id: string }> = async (
  rawArgs,
  context,
) => {
  await requireCmsEditor(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(cmsIdSchema, rawArgs);
  try {
    await prisma.$transaction(async (tx) => {
      const affectedPost = await tx.cmsPost.findFirst({
        where: { status: "PUBLISHED", tags: { some: { id } } },
        select: { id: true, slug: true },
      });
      await tx.cmsTag.delete({ where: { id } });
      if (affectedPost) {
        await enqueuePublicationEvent(tx, {
          postId: affectedPost.id,
          slug: affectedPost.slug,
          eventType: "TAXONOMY_UPDATED",
        });
      }
    });
    return { id };
  } catch (error) {
    return mapCmsWriteError(error);
  }
};
