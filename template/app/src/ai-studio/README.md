# AI Animation Studio

This module owns the prompt optimization, structured HTML generation, usage policy, animation history, and background video rendering flow.

## Runtime

- `OPENAI_API_KEY` is shared with the existing demo AI app.
- `AI_STUDIO_MODEL` optionally overrides the default `gpt-4o-mini` model.
- `AI_VIDEO_STORAGE_DIR` optionally selects the private server-side video directory. It defaults to `storage/ai-studio-videos` under the server working directory.
- Install the Playwright browser once with `npx playwright install chromium`.
- `ffmpeg-static` supplies the MP4 transcoder. A normal dependency install runs its binary installer; use `npm rebuild ffmpeg-static` if install scripts were previously disabled.

The renderer writes only temporary capture data outside the storage directory and removes it in a `finally` block. Production deployments with ephemeral disks should replace the filesystem adapter with object storage while keeping the authenticated download API.

## Safety Model

Generated HTML is rejected when it contains external resources, navigation, frames, forms, network APIs, workers, dynamic imports, or dynamic code evaluation. Accepted HTML is wrapped with a restrictive CSP and rendered in an iframe whose only sandbox permission is `allow-scripts`; it never receives `allow-same-origin` or navigation permissions.

All operations require an authenticated user and scope database access by `userId`. A shared hourly quota window is claimed with a serializable transaction and an atomic conditional update. The same ledger also enforces two concurrent operations, idempotency, token/cost accounting, and terminal success/failure release.

## Video States

`NOT_REQUESTED -> QUEUED -> PROCESSING -> SUCCEEDED`

Renderer failures return to `QUEUED` while PgBoss retries remain. The third failed attempt becomes `FAILED`; a user retry starts a new bounded job. Downloads stream through `/ai-studio/videos/:id` only after ownership and storage-boundary checks.

## Tests

```powershell
npm test
$env:RUN_VIDEO_INTEGRATION='1'; npx vitest run --config src/ai-studio/vitest.config.ts src/ai-studio/videoRenderer.integration.test.ts
```
