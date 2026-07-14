import { HttpError } from "wasp/server";
import { type GetOperationsOverview } from "wasp/server/operations";
import { CMS_PUBLICATION_TASKS_PATH } from "../content-cms/publicationTask";
import { getCmsSeoReadinessIssues } from "../content-cms/validation";

const OVERVIEW_RANGE_DAYS = 7;
const RECENT_TASK_LIMIT = 10;

export type OperationsOverview = {
  generatedAt: Date;
  rangeDays: number;
  scope: "workspace" | "personal";
  capabilities: {
    canPublish: boolean;
    canAdmin: boolean;
  };
  animation: {
    total: number;
    createdInRange: number;
    ready: number;
    failed: number;
  };
  rendering: {
    queued: number;
    processing: number;
    succeeded: number;
    failed: number;
  };
  publishing: {
    totalPosts: number;
    drafts: number;
    published: number;
    pendingEvents: number;
    processingEvents: number;
    processedEvents: number;
    failedEvents: number;
    disabledEvents: number;
  };
  seo: {
    evaluatedPosts: number;
    readyPosts: number;
    needsWorkPosts: number;
  };
  usage: {
    requestsInRange: number;
    failedRequestsInRange: number;
    tokensInRange: number;
    estimatedCostMicrosInRange: number;
  };
  tasks: {
    active: number;
    failed: number;
    actionRequired: number;
    completedInRange: number;
    recent: OperationTask[];
  };
  team: {
    activeUsers: number;
    disabledUsers: number;
  } | null;
};

export type OperationTask = {
  id: string;
  kind: "render" | "publication" | "generation";
  title: string;
  detail: string | null;
  status: "queued" | "processing" | "succeeded" | "failed" | "action_required";
  updatedAt: Date;
  href: string;
};

type WorkspaceUser = {
  id: string;
  isAdmin: boolean;
  role?: "ADMIN" | "EDITOR" | "CREATOR";
  isDisabled?: boolean;
};

export const getOperationsOverview: GetOperationsOverview<
  void,
  OperationsOverview
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Authentication is required.");
  }

  const user = context.user as WorkspaceUser;
  if (user.isDisabled) {
    throw new HttpError(403, "This account is disabled.");
  }

  const isAdmin = user.isAdmin || user.role === "ADMIN";
  const canPublish = isAdmin || user.role === "EDITOR";
  const rangeStart = new Date(
    Date.now() - OVERVIEW_RANGE_DAYS * 24 * 60 * 60 * 1_000,
  );
  const animationWhere = isAdmin ? {} : { userId: user.id };
  const usageWhere = isAdmin ? {} : { userId: user.id };

  const [
    animationTotal,
    animationCreatedInRange,
    animationStatusGroups,
    videoStatusGroups,
    recentAnimations,
    usageInRange,
    failedUsageInRange,
    postStatusGroups,
    postsForSeo,
    publicationStatusGroups,
    recentPublicationEvents,
    completedVideosInRange,
    completedPublicationsInRange,
    activeUsers,
    disabledUsers,
  ] = await Promise.all([
    context.entities.AiAnimation.count({ where: animationWhere }),
    context.entities.AiAnimation.count({
      where: { ...animationWhere, createdAt: { gte: rangeStart } },
    }),
    context.entities.AiAnimation.groupBy({
      by: ["status"],
      where: animationWhere,
      _count: { _all: true },
    }),
    context.entities.AiAnimation.groupBy({
      by: ["videoStatus"],
      where: animationWhere,
      _count: { _all: true },
    }),
    context.entities.AiAnimation.findMany({
      where: {
        ...animationWhere,
        OR: [{ status: "FAILED" }, { videoStatus: { not: "NOT_REQUESTED" } }],
      },
      select: {
        id: true,
        title: true,
        status: true,
        generationError: true,
        videoStatus: true,
        videoFormat: true,
        videoError: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: RECENT_TASK_LIMIT,
    }),
    context.entities.AiUsageLog.aggregate({
      where: { ...usageWhere, createdAt: { gte: rangeStart } },
      _count: { _all: true },
      _sum: { totalTokens: true, estimatedCostMicros: true },
    }),
    context.entities.AiUsageLog.count({
      where: {
        ...usageWhere,
        createdAt: { gte: rangeStart },
        status: "FAILED",
      },
    }),
    canPublish
      ? context.entities.CmsPost.groupBy({
          by: ["status"],
          _count: { _all: true },
        })
      : Promise.resolve([]),
    canPublish
      ? context.entities.CmsPost.findMany({
          select: {
            title: true,
            slug: true,
            excerpt: true,
            content: true,
            status: true,
            authorId: true,
          },
        })
      : Promise.resolve([]),
    canPublish
      ? context.entities.CmsPublicationEvent.groupBy({
          by: ["status"],
          _count: { _all: true },
        })
      : Promise.resolve([]),
    canPublish
      ? context.entities.CmsPublicationEvent.findMany({
          select: {
            id: true,
            eventType: true,
            payload: true,
            status: true,
            attempts: true,
            lastError: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
          take: RECENT_TASK_LIMIT,
        })
      : Promise.resolve([]),
    context.entities.AiAnimation.count({
      where: {
        ...animationWhere,
        videoStatus: "SUCCEEDED",
        videoUpdatedAt: { gte: rangeStart },
      },
    }),
    canPublish
      ? context.entities.CmsPublicationEvent.count({
          where: { status: "PROCESSED", processedAt: { gte: rangeStart } },
        })
      : Promise.resolve(0),
    isAdmin
      ? context.entities.User.count({ where: { isDisabled: false } })
      : Promise.resolve(0),
    isAdmin
      ? context.entities.User.count({ where: { isDisabled: true } })
      : Promise.resolve(0),
  ]);

  const readyPosts = postsForSeo.filter(
    (post) =>
      getCmsSeoReadinessIssues({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        authorId: post.authorId,
      }).length === 0,
  ).length;

  const recentTasks = [
    ...recentAnimations.map(mapAnimationTask),
    ...recentPublicationEvents.map(mapPublicationTask),
  ]
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, RECENT_TASK_LIMIT);

  const queuedRenders = getStatusCount(videoStatusGroups, "QUEUED");
  const processingRenders = getStatusCount(videoStatusGroups, "PROCESSING");
  const failedRenders = getStatusCount(videoStatusGroups, "FAILED");
  const failedGenerations = getStatusCount(animationStatusGroups, "FAILED");
  const pendingPublications = getStatusCount(
    publicationStatusGroups,
    "PENDING",
  );
  const processingPublications = getStatusCount(
    publicationStatusGroups,
    "PROCESSING",
  );
  const failedPublications = getStatusCount(publicationStatusGroups, "FAILED");
  const disabledPublications = getStatusCount(
    publicationStatusGroups,
    "DISABLED",
  );

  return {
    generatedAt: new Date(),
    rangeDays: OVERVIEW_RANGE_DAYS,
    scope: isAdmin ? "workspace" : "personal",
    capabilities: { canPublish, canAdmin: isAdmin },
    animation: {
      total: animationTotal,
      createdInRange: animationCreatedInRange,
      ready: getStatusCount(animationStatusGroups, "READY"),
      failed: failedGenerations,
    },
    rendering: {
      queued: queuedRenders,
      processing: processingRenders,
      succeeded: getStatusCount(videoStatusGroups, "SUCCEEDED"),
      failed: failedRenders,
    },
    publishing: {
      totalPosts: sumStatusCounts(postStatusGroups),
      drafts: getStatusCount(postStatusGroups, "DRAFT"),
      published: getStatusCount(postStatusGroups, "PUBLISHED"),
      pendingEvents: pendingPublications,
      processingEvents: processingPublications,
      processedEvents: getStatusCount(publicationStatusGroups, "PROCESSED"),
      failedEvents: failedPublications,
      disabledEvents: disabledPublications,
    },
    seo: {
      evaluatedPosts: postsForSeo.length,
      readyPosts,
      needsWorkPosts: postsForSeo.length - readyPosts,
    },
    usage: {
      requestsInRange: usageInRange._count._all,
      failedRequestsInRange: failedUsageInRange,
      tokensInRange: usageInRange._sum.totalTokens ?? 0,
      estimatedCostMicrosInRange: usageInRange._sum.estimatedCostMicros ?? 0,
    },
    tasks: {
      active:
        queuedRenders +
        processingRenders +
        pendingPublications +
        processingPublications,
      failed: failedGenerations + failedRenders + failedPublications,
      actionRequired: disabledPublications,
      completedInRange: completedVideosInRange + completedPublicationsInRange,
      recent: recentTasks,
    },
    team: isAdmin ? { activeUsers, disabledUsers } : null,
  };
};

function getStatusCount(
  groups: readonly {
    _count: { _all: number };
    status?: string;
    videoStatus?: string;
  }[],
  status: string,
): number {
  return (
    groups.find(
      (group) => group.status === status || group.videoStatus === status,
    )?._count._all ?? 0
  );
}

function sumStatusCounts(
  groups: readonly { _count: { _all: number } }[],
): number {
  return groups.reduce((total, group) => total + group._count._all, 0);
}

function mapAnimationTask(animation: {
  id: string;
  title: string;
  status: string;
  generationError: string | null;
  videoStatus: string;
  videoFormat: string | null;
  videoError: string | null;
  updatedAt: Date;
}): OperationTask {
  if (animation.status === "FAILED") {
    return {
      id: `generation:${animation.id}`,
      kind: "generation",
      title: animation.title,
      detail: animation.generationError,
      status: "failed",
      updatedAt: animation.updatedAt,
      href: "/ai-studio",
    };
  }

  return {
    id: `render:${animation.id}`,
    kind: "render",
    title: animation.title,
    detail: animation.videoError ?? animation.videoFormat,
    status: normalizeTaskStatus(animation.videoStatus),
    updatedAt: animation.updatedAt,
    href: "/ai-studio",
  };
}

function mapPublicationTask(event: {
  id: string;
  eventType: string;
  payload: unknown;
  status: string;
  attempts: number;
  lastError: string | null;
  updatedAt: Date;
}): OperationTask {
  const slug = readPayloadSlug(event.payload);
  return {
    id: `publication:${event.id}`,
    kind: "publication",
    title: slug ? `/${slug}` : event.eventType.replaceAll("_", " "),
    detail:
      event.lastError ??
      (event.attempts > 0 ? `Attempt ${event.attempts}` : event.eventType),
    status: normalizeTaskStatus(event.status),
    updatedAt: event.updatedAt,
    href: CMS_PUBLICATION_TASKS_PATH,
  };
}

function normalizeTaskStatus(status: string): OperationTask["status"] {
  switch (status) {
    case "PENDING":
    case "QUEUED":
      return "queued";
    case "PROCESSING":
    case "STARTED":
      return "processing";
    case "FAILED":
      return "failed";
    case "DISABLED":
      return "action_required";
    default:
      return "succeeded";
  }
}

function readPayloadSlug(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const slug = (payload as { slug?: unknown }).slug;
  return typeof slug === "string" && slug.length > 0 ? slug : null;
}
