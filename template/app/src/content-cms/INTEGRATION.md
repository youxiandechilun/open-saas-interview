# Content CMS integration contract

The CMS module is the canonical source for blog content. Build systems must use the
raw `GET /content-cms/published` endpoint via `CMS_CONTENT_API_URL`; when
`CMS_CONTENT_API_TOKEN` is set, send it as a bearer token. There is intentionally no
public Wasp query that can bypass this token boundary. The endpoint returns only
`PUBLISHED` records in deterministic order, a canonical `/blog/<slug>/` path, the
latest content timestamp, and a deterministic `contentVersion` suitable for ETags,
incremental builds, or cache keys. It also sends `X-Robots-Tag: noindex, nofollow` so
the machine-readable feed is not indexed as a competing public page.

Published posts retain a safe animation summary. `publicMediaPath` is present only
for an attached `READY` animation whose video is `SUCCEEDED` with a supported,
matching MP4 or WebM MIME type. The feed never exposes generated HTML or the private
storage path. `GET /content-cms/media/:id` serves that video only while at least one
`PUBLISHED` post references it; the handler rechecks managed storage, resolves
symlinks, uses `inline` disposition, and sends public cache, cross-origin, and
`nosniff` headers.

## Wasp integration

Import `contentCmsSpec` from `./src/content-cms/content-cms.wasp` and append it to the
root `spec` array. The workspace navigation link targets the generated
`ContentCmsAdminRoute` at `/admin/content`. Active `ADMIN` and `EDITOR` users may
read drafts and write CMS records; legacy `isAdmin` users remain compatible.

## Prisma contract

The operations require these relation names and fields:

- `CmsAuthor`: `id`, unique `slug`, `name`, nullable `bio`, timestamps, and `posts CmsPost[]`.
- `CmsTag`: `id`, unique `slug`, `name`, timestamps, and `posts CmsPost[]`.
- `CmsPost`: the task fields, unique `slug`, `author CmsAuthor`, `tags CmsTag[]`,
  `createdBy User`, and optional `animation AiAnimation` through `animationId` with
  `onDelete: SetNull`.
- `AiAnimation`: the existing AI Studio fields plus the inverse `cmsPosts CmsPost[]`
  relation.
- `CmsPostStatus`: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- `CmsPublicationEvent`: `id`, `postId`, `eventType`, `contentVersion`, `payload Json`,
  `status` defaulting to `PENDING`, `attempts` defaulting to `0`, nullable `lastError`,
  `availableAt` defaulting to now, `createdAt`, `updatedAt @updatedAt`, and nullable
  `processedAt`. Keep `postId` as a scalar without a foreign key: deletion events must
  outlive the post they describe. Do not add a uniqueness constraint across post,
  event type, and version because a previously seen content state can legitimately
  recur after unpublishing and republishing.

Recommended indexes are `CmsPost(status, publishedAt)`, `CmsPost(authorId)`,
`CmsPost(animationId)`,
`CmsPublicationEvent(status, availableAt, createdAt)`, and
`CmsPublicationEvent(postId, createdAt)`.

## Publication and rebuild processing

Creating or updating a published post validates SEO readiness and writes the post
plus a `CmsPublicationEvent` in one database transaction. Moving a published post to
draft or archived emits `UNPUBLISHED`; deleting it emits `DELETED`. No external
request runs inside that transaction. A worker may claim `PENDING` events, trigger
the Astro rebuild or webhook, then mark them `PROCESSED`. `PROCESSED` means the
webhook acknowledged dispatch, not that the public deployment is live. Failures should increment
`attempts`, store `lastError`, and be retried with backoff. The scheduled PgBoss dispatcher
claims events atomically, recovers stale claims, retries with exponential backoff,
and sends an `Idempotency-Key` header containing the event ID. Consumers can compare
the event's `contentVersion` with the public feed version before scheduling
redundant work.

For deletion, the post is removed before the feed version is computed and the
`DELETED` outbox event is inserted. Both writes share one transaction, so an event
write failure restores the post. The scalar, non-FK `postId` lets that event outlive
the deleted row. `getCmsPublicationTasks` reads every active or retryable event
directly from the outbox payload, so normal publication failures and failed removals
share one actionable list after a post disappears from normal CMS queries. The CMS
panel at `#publication-tasks` can retry `FAILED` or `DISABLED` events without a
`CmsPost` relation.

When either `CMS_REBUILD_WEBHOOK_URL` or `CMS_REBUILD_WEBHOOK_TOKEN` is absent, new
and previously queued events become `DISABLED` with an actionable reason instead of
remaining `PENDING` or sending an anonymous request. Once both values are configured,
editors can retry a failed or disabled event; the
retry transition back to `PENDING` is conditional so concurrent retries cannot
requeue an event that another worker has already processed.

Updating an author or tag used by a published post also emits `TAXONOMY_UPDATED`, so
bylines, tag pages, and feed versions cannot drift from the canonical CMS state.

An active editor or administrator can browse `READY` animations created by active
teammates. The selector shows a derived creator label (username first, then email)
without returning account IDs or both identity fields. Only an animation with a
completed, supported MP4 or WebM video can be newly attached or published; pending
renders remain visible but disabled. A historical attachment from a disabled owner
may be preserved or removed while editing a draft, but it cannot be newly attached
and must pass the same media gate before publication. This team handoff does not
change AI Studio edit or private-download ownership rules. The public feed omits the
creator label, includes only the safe animation summary and eligible public media
path, and never returns generated HTML or storage metadata.

Drafts may be incomplete. Publishing requires a valid slug, title length of 10-65,
excerpt length of 50-160, at least 200 characters of content, an author, no body H1,
at least one H2 section, at least one internal link, and alt text on every image. The
server always enforces these checks even if a client bypasses the workspace UI.
