import type {
  CmsPublicationTaskStatus,
  CmsPublicationTaskSummary,
} from "./types";

export const CMS_PUBLICATION_TASKS_ID = "publication-tasks";
export const CMS_PUBLICATION_TASKS_HASH = `#${CMS_PUBLICATION_TASKS_ID}`;
export const CMS_PUBLICATION_TASKS_PATH = `/admin/content${CMS_PUBLICATION_TASKS_HASH}`;

export const CMS_PUBLICATION_TASK_STATUSES = [
  "PENDING",
  "PROCESSING",
  "FAILED",
  "DISABLED",
] as const satisfies readonly CmsPublicationTaskStatus[];

export function getPublicationTaskSlug(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const slug = (payload as Record<string, unknown>).slug;
  return typeof slug === "string" && slug.trim() ? slug.trim() : null;
}

type CmsPublicationEventCandidate = {
  id: string;
  postId: string;
  eventType: string;
  payload: unknown;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toCmsPublicationTask(
  event: CmsPublicationEventCandidate,
): CmsPublicationTaskSummary | null {
  const status = CMS_PUBLICATION_TASK_STATUSES.find(
    (candidate) => candidate === event.status,
  );
  if (!status) return null;

  return {
    eventId: event.id,
    postId: event.postId,
    eventType: event.eventType,
    slug: getPublicationTaskSlug(event.payload),
    status,
    attempts: event.attempts,
    lastError: event.lastError,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}
