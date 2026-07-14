import { describe, expect, it } from "vitest";
import {
  CMS_PUBLICATION_TASK_STATUSES,
  CMS_PUBLICATION_TASKS_HASH,
  CMS_PUBLICATION_TASKS_ID,
  CMS_PUBLICATION_TASKS_PATH,
  getPublicationTaskSlug,
  toCmsPublicationTask,
} from "./publicationTask";

const event = {
  id: "event-1",
  postId: "post-1",
  eventType: "DELETED",
  payload: { slug: "deleted-article" },
  status: "FAILED",
  attempts: 2,
  lastError: "Webhook failed.",
  createdAt: new Date("2026-07-14T08:00:00.000Z"),
  updatedAt: new Date("2026-07-14T08:05:00.000Z"),
};

describe("publication task projection", () => {
  it("keeps active and retryable outbox states visible", () => {
    expect(CMS_PUBLICATION_TASK_STATUSES).toEqual([
      "PENDING",
      "PROCESSING",
      "FAILED",
      "DISABLED",
    ]);
  });

  it("links task-center publication rows to the actionable CMS panel", () => {
    expect(CMS_PUBLICATION_TASKS_ID).toBe("publication-tasks");
    expect(CMS_PUBLICATION_TASKS_HASH).toBe("#publication-tasks");
    expect(CMS_PUBLICATION_TASKS_PATH).toBe("/admin/content#publication-tasks");
  });

  it("extracts and trims the deleted post slug", () => {
    expect(getPublicationTaskSlug({ slug: " deleted-article " })).toBe(
      "deleted-article",
    );
  });

  it.each([null, [], "payload", { slug: "" }, { slug: 42 }])(
    "returns null for malformed payload %j",
    (payload) => expect(getPublicationTaskSlug(payload)).toBeNull(),
  );

  it("projects a retryable event without a CmsPost relation", () => {
    expect(toCmsPublicationTask(event)).toEqual({
      eventId: "event-1",
      postId: "post-1",
      eventType: "DELETED",
      slug: "deleted-article",
      status: "FAILED",
      attempts: 2,
      lastError: "Webhook failed.",
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    });
  });

  it("keeps non-deletion events actionable from the task center", () => {
    expect(
      toCmsPublicationTask({
        ...event,
        eventType: "CONTENT_UPDATED",
        status: "DISABLED",
      }),
    ).toMatchObject({ eventType: "CONTENT_UPDATED", status: "DISABLED" });
  });

  it("hides completed events", () => {
    expect(toCmsPublicationTask({ ...event, status: "PROCESSED" })).toBeNull();
  });
});
