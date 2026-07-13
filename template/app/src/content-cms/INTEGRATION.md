# Content CMS integration contract

The CMS module is the canonical source for blog content. Integrators should consume
`getPublishedCmsPosts`, not query `CmsPost` directly. Build systems should use the raw
`GET /content-cms/published` endpoint via `CMS_CONTENT_API_URL`; when
`CMS_CONTENT_API_TOKEN` is set, send it as a bearer token. Both surfaces return only
`PUBLISHED` records in deterministic order, a canonical `/blog/<slug>/` path, the
latest content timestamp, and a deterministic `contentVersion` suitable for ETags,
incremental builds, or cache keys.

## Wasp integration

Import `contentCmsSpec` from `./src/content-cms/content-cms.wasp` and append it to the
root `spec` array. The optional admin navigation link targets the generated
`ContentCmsAdminRoute` at `/admin/content`.

## Prisma contract

The operations require these relation names and fields:

- `CmsAuthor`: `id`, unique `slug`, `name`, nullable `bio`, timestamps, and `posts CmsPost[]`.
- `CmsTag`: `id`, unique `slug`, `name`, timestamps, and `posts CmsPost[]`.
- `CmsPost`: the task fields, unique `slug`, `author CmsAuthor`, `tags CmsTag[]`, and `createdBy User`.
- `CmsPostStatus`: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- `CmsPublicationEvent`: `id`, `postId`, `eventType`, `contentVersion`, `payload Json`,
  `status` defaulting to `PENDING`, `attempts` defaulting to `0`, nullable `lastError`,
  `availableAt` defaulting to now, `createdAt`, `updatedAt @updatedAt`, and nullable
  `processedAt`. Keep `postId` as a scalar without a foreign key: deletion events must
  outlive the post they describe. Do not add a uniqueness constraint across post,
  event type, and version because a previously seen content state can legitimately
  recur after unpublishing and republishing.

Recommended indexes are `CmsPost(status, publishedAt)`, `CmsPost(authorId)`,
`CmsPublicationEvent(status, availableAt, createdAt)`, and
`CmsPublicationEvent(postId, createdAt)`.

## Publication and rebuild processing

Creating or updating a published post validates SEO readiness and writes the post
plus a `CmsPublicationEvent` in one database transaction. Moving a published post to
draft or archived emits `UNPUBLISHED`; deleting it emits `DELETED`. No external
request runs inside that transaction. A worker may claim `PENDING` events, trigger
the Astro rebuild or webhook, then mark them `PROCESSED`; failures should increment
`attempts`, store `lastError`, and be retried with backoff. The scheduled PgBoss dispatcher
claims events atomically, recovers stale claims, retries with exponential backoff,
and sends an `Idempotency-Key` header containing the event ID. Consumers can compare
the event's `contentVersion` with the public feed version before scheduling
redundant work.

Updating an author or tag used by a published post also emits `TAXONOMY_UPDATED`, so
bylines, tag pages, and feed versions cannot drift from the canonical CMS state.

Drafts may be incomplete. Publishing requires a valid slug, title length of 10-65,
excerpt length of 50-160, at least 200 characters of content, an author, no body H1,
and alt text on every image. The server always enforces these checks even if a client
bypasses the admin UI.
