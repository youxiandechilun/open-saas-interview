# AI Animation Studio

This module owns the prompt optimization, structured HTML generation, usage policy, animation history, and background video rendering flow.

## Runtime

- `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, and `AI_STUDIO_MODEL`
  provide an optional environment fallback when no database override exists.
- The legacy scheduler endpoint is disabled and cannot bypass the governed AI
  Studio provider, quota, or audit path.
- `AI_CONFIG_ENCRYPTION_KEY` enables the admin provider settings at `/admin/ai-provider`. It must be a stable base64-encoded or hex-encoded 32-byte key.
- `AI_VIDEO_STORAGE_DIR` selects the private server-side video directory. Production requires an absolute path backed by a persistent volume; relative paths are rejected so output never lands inside generated Wasp directories. Development defaults to `~/.motionpress/ai-studio-videos`, and relative development paths are anchored to the user's home directory.
- Install the Playwright browser and Linux dependencies once with `npx playwright install chromium` and `npx playwright install-deps chromium`.

The animation studio resolves its provider from the encrypted database override first and falls back to the OpenAI environment variables when no override exists. API keys are encrypted with AES-256-GCM, are represented in the UI only by a short hint, and are never returned by provider settings operations.

- `ffmpeg-static` supplies the MP4 transcoder. A normal dependency install runs its binary installer; use `npm rebuild ffmpeg-static` if install scripts were previously disabled.

The renderer writes only temporary capture data outside the storage directory and removes it in a `finally` block. The configured production directory must survive application rebuilds and restarts. Mount a persistent filesystem volume there, or replace the filesystem adapter with object storage while keeping the authenticated download API.

## Safety Model

Generated HTML is rejected when it contains external resources, navigation, frames, forms, network APIs, workers, dynamic imports, or dynamic code evaluation. Accepted HTML is wrapped with a restrictive CSP and rendered in an iframe whose only sandbox permission is `allow-scripts`; it never receives `allow-same-origin` or navigation permissions.

All operations require an authenticated user and scope database access by `userId`. A shared hourly quota window is claimed with a serializable transaction and an atomic conditional update. The same ledger also enforces two concurrent operations, idempotency, token/cost accounting, and terminal success/failure release.

## Video States

`NOT_REQUESTED -> QUEUED -> PROCESSING -> SUCCEEDED`

Renderer failures return to `QUEUED` while PgBoss retries remain. The third failed attempt becomes `FAILED`; a user retry starts a new bounded job. A `SUCCEEDED` record is replayed, downloaded, attached, or published only after the stored path resolves to a regular file inside the configured storage root with matching format and MIME metadata. Missing or unsafe output is atomically changed to `FAILED` with `VIDEO_FILE_MISSING`, allowing a fresh render.

## Tests

```powershell
npm test
$env:RUN_VIDEO_INTEGRATION='1'; npx vitest run --config src/ai-studio/vitest.config.ts src/ai-studio/videoRenderer.integration.test.ts
```
