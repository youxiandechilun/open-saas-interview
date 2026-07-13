import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { HttpError, prisma } from "wasp/server";
import {
  type CreateCmsAuthor,
  type CreateCmsPost,
  type CreateCmsTag,
  type DeleteCmsAuthor,
  type DeleteCmsPost,
  type DeleteCmsTag,
  type GetCmsPosts,
  type GetCmsTaxonomy,
  type GetPublishedCmsPosts,
  type UpdateCmsAuthor,
  type UpdateCmsPost,
  type UpdateCmsTag,
} from "wasp/server/operations";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import {
  type CmsPostPage,
  type CmsTaxonomy,
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

type AdminContext = { user?: { id: string; isAdmin: boolean } | null };

function requireAdmin(context: AdminContext) {
  if (!context.user) {
    throw new HttpError(401, "Authentication is required.");
  }
  if (!context.user.isAdmin) {
    throw new HttpError(403, "Administrator access is required.");
  }
  return context.user;
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
} satisfies Prisma.CmsPostSelect;

type SelectedCmsPost = Prisma.CmsPostGetPayload<{
  select: typeof postSelection;
}>;

function computePublishedFeedVersion(posts: SelectedCmsPost[]) {
  const canonicalContent = posts
    .map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      updatedAt: post.updatedAt.toISOString(),
      author: post.author,
      tags: [...post.tags].sort((left, right) =>
        left.id.localeCompare(right.id),
      ),
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
      status: { in: ["PENDING", "PROCESSING"] },
    },
    select: { id: true },
  });
  if (duplicate) return;

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
      status: "PENDING",
    },
  });
}

export const getCmsPosts: GetCmsPosts<CmsPostFilterInput, CmsPostPage> = async (
  rawArgs,
  context,
) => {
  requireAdmin(context);
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

  return {
    items: items as CmsPostPage["items"],
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
      ...(post as PublishedCmsFeed["posts"][number]),
      canonicalPath: `/blog/${post.slug}/`,
    })),
  };
}

export const getPublishedCmsPosts: GetPublishedCmsPosts<
  void,
  PublishedCmsFeed
> = async () => {
  return readPublishedCmsFeed();
};

export const getCmsTaxonomy: GetCmsTaxonomy<void, CmsTaxonomy> = async (
  _args,
  context,
) => {
  requireAdmin(context);
  const [authors, tags] = await Promise.all([
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
  };
};

export const createCmsPost: CreateCmsPost<
  ParsedCmsPostWriteInput,
  CmsPostPage["items"][number]
> = async (rawArgs, context) => {
  const user = requireAdmin(context);
  const input = ensureArgsSchemaOrThrowHttpError(cmsPostWriteSchema, rawArgs);
  const slug = resolveSlug(input.slug, input.title);
  await ensureUniqueSlug("post", slug, () =>
    prisma.cmsPost.findUnique({ where: { slug }, select: { id: true } }),
  );
  const tagIds = await assertRelationsExist(input.authorId, input.tagIds);
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
      return post as CmsPostPage["items"][number];
    })) as CmsPostPage["items"][number];
  } catch (error) {
    return mapCmsWriteError(error);
  }
};

export const updateCmsPost: UpdateCmsPost<
  CmsPostUpdateInput,
  CmsPostPage["items"][number]
> = async (rawArgs, context) => {
  requireAdmin(context);
  const input = ensureArgsSchemaOrThrowHttpError(cmsPostUpdateSchema, rawArgs);
  const existing = await prisma.cmsPost.findUnique({
    where: { id: input.id },
    select: { id: true, status: true, publishedAt: true },
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
              ? (existing.publishedAt ?? new Date())
              : input.status === "DRAFT"
                ? null
                : existing.publishedAt,
          authorId: input.authorId,
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
      return post as CmsPostPage["items"][number];
    })) as CmsPostPage["items"][number];
  } catch (error) {
    return mapCmsWriteError(error);
  }
};

export const deleteCmsPost: DeleteCmsPost<CmsIdInput, { id: string }> = async (
  rawArgs,
  context,
) => {
  requireAdmin(context);
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
  requireAdmin(context);
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
  requireAdmin(context);
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
  requireAdmin(context);
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
  requireAdmin(context);
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
  requireAdmin(context);
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
  requireAdmin(context);
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
