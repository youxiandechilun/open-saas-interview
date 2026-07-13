import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { env } from "wasp/server";
import { buildSandboxSrcDoc } from "../security";

const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;
const RENDER_TIMEOUT_MS = 90_000;

export type VideoFormat = "mp4" | "webm";

export type RenderedVideo = {
  storagePath: string;
  mimeType: "video/mp4" | "video/webm";
};

export async function renderAnimationVideo(input: {
  html: string;
  durationSeconds: number;
  format: VideoFormat;
  userId: string;
  animationId: string;
}): Promise<RenderedVideo> {
  const workDir = await mkdtemp(path.join(tmpdir(), "ai-animation-"));
  const rawWebm = path.join(workDir, "capture.webm");
  const stagedOutput = path.join(workDir, `render.${input.format}`);
  const outputDir = path.join(getVideoStorageRoot(), input.userId);
  const finalPath = path.join(
    outputDir,
    `${input.animationId}.${input.format}`,
  );
  let browser: Awaited<
    ReturnType<(typeof import("playwright"))["chromium"]["launch"]>
  > | null = null;

  try {
    const { chromium } = await import("playwright");
    browser = await withTimeout(
      chromium.launch({ headless: true }),
      RENDER_TIMEOUT_MS,
      "Browser launch timed out",
    );
    const context = await browser.newContext({
      viewport: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
      recordVideo: {
        dir: workDir,
        size: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
      },
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    await page.route("**/*", (route) => route.abort("blockedbyclient"));
    const video = page.video();
    if (!video) throw new Error("Playwright video capture is unavailable");

    await withTimeout(
      page.setContent(buildSandboxSrcDoc(input.html), {
        waitUntil: "load",
        timeout: 15_000,
      }),
      RENDER_TIMEOUT_MS,
      "Animation page load timed out",
    );
    await withTimeout(
      page.waitForTimeout(
        Math.min(10, Math.max(2, input.durationSeconds)) * 1000,
      ),
      RENDER_TIMEOUT_MS,
      "Animation capture timed out",
    );
    await page.close();
    await context.close();
    await withTimeout(
      video.saveAs(rawWebm),
      RENDER_TIMEOUT_MS,
      "Video save timed out",
    );

    if (input.format === "mp4") {
      await transcodeToMp4(rawWebm, stagedOutput);
    } else {
      await copyFile(rawWebm, stagedOutput);
    }

    await mkdir(outputDir, { recursive: true });
    await rm(finalPath, { force: true });
    await rename(stagedOutput, finalPath);
    return {
      storagePath: finalPath,
      mimeType: input.format === "mp4" ? "video/mp4" : "video/webm",
    };
  } finally {
    if (browser) {
      await withTimeout(
        browser.close(),
        5_000,
        "Browser cleanup timed out",
      ).catch(() => undefined);
    }
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function transcodeToMp4(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  if (!ffmpegPath) throw new Error("ffmpeg-static did not provide a binary");
  const executable = ffmpegPath;

  await new Promise<void>((resolve, reject) => {
    execFile(
      executable,
      [
        "-y",
        "-i",
        inputPath,
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      {
        windowsHide: true,
        timeout: RENDER_TIMEOUT_MS,
        maxBuffer: 4_000_000,
      },
      (error, _stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `ffmpeg failed: ${error.message}; ${stderr.slice(-4_000)}`,
            ),
          );
        } else {
          resolve();
        }
      },
    );
  });
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    timeout.unref();
  });
  try {
    return await Promise.race([promise, deadline]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function getVideoStorageRoot(): string {
  return path.resolve(
    env.AI_VIDEO_STORAGE_DIR ??
      path.join(process.cwd(), "storage", "ai-studio-videos"),
  );
}

export function isPathInsideVideoStorage(candidate: string): boolean {
  const relative = path.relative(
    getVideoStorageRoot(),
    path.resolve(candidate),
  );
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
}
