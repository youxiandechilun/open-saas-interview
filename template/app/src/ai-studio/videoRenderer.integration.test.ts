import { rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const outputRoot = path.join(tmpdir(), `ai-studio-render-test-${process.pid}`);
process.env.AI_VIDEO_STORAGE_DIR = outputRoot;

afterAll(async () => {
  await rm(outputRoot, { recursive: true, force: true });
});

describe.skipIf(process.env.RUN_VIDEO_INTEGRATION !== "1")(
  "video renderer",
  () => {
    it.each(["webm", "mp4"] as const)(
      "captures a self-contained animation as %s",
      async (format) => {
        const { renderAnimationVideo } = await import("./server/videoRenderer");
        const result = await renderAnimationVideo({
          html: `<html><head><style>body{margin:0;background:#101820;color:white;display:grid;place-items:center}.dot{width:120px;height:120px;background:#ef4444;animation:pulse 1s infinite alternate}@keyframes pulse{to{transform:scale(1.4)}}</style></head><body><div class="dot"></div></body></html>`,
          durationSeconds: 2,
          format,
          userId: "test-user",
          animationId: `test-animation-${format}`,
          renderAttemptId: `test-attempt-${format}`,
        });
        expect(result.mimeType).toBe(`video/${format}`);
        expect((await stat(result.storagePath)).size).toBeGreaterThan(1_000);
      },
      120_000,
    );
  },
);
