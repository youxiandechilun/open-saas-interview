import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  VIDEO_FILE_MISSING_ERROR,
  validateStoredVideoAsset,
  validateSucceededVideoAsset,
} from "./server/videoAsset";
import { resolveVideoStorageRoot } from "./server/videoRenderer";

let storageRoot: string;

beforeEach(async () => {
  storageRoot = await mkdtemp(path.join(tmpdir(), "motionpress-video-asset-"));
});

afterEach(async () => {
  await rm(storageRoot, { recursive: true, force: true });
});

describe("stored video asset validation", () => {
  it("rejects a missing video file", async () => {
    const result = await validateStoredVideoAsset(
      candidate(path.join(storageRoot, "missing.mp4")),
      storageRoot,
    );

    expect(result).toEqual({ ok: false, reason: "missing" });
  });

  it("rejects traversal, MIME mismatches, and non-file paths", async () => {
    const outside = path.join(storageRoot, "..", "outside.mp4");
    expect(
      await validateStoredVideoAsset(candidate(outside), storageRoot),
    ).toEqual({ ok: false, reason: "outside_storage" });

    const mismatched = path.join(storageRoot, "mismatch.mp4");
    await writeFile(mismatched, "video");
    expect(
      await validateStoredVideoAsset(
        { ...candidate(mismatched), videoMimeType: "video/webm" },
        storageRoot,
      ),
    ).toEqual({ ok: false, reason: "metadata_mismatch" });

    const directory = path.join(storageRoot, "directory.mp4");
    await mkdir(directory);
    expect(
      await validateStoredVideoAsset(candidate(directory), storageRoot),
    ).toEqual({ ok: false, reason: "not_regular_file" });
  });

  it("uses a metadata CAS to invalidate missing output for a fresh render", async () => {
    const invalidate = vi.fn().mockResolvedValue({ count: 1 });
    const asset = candidate(path.join(storageRoot, "missing.mp4"));

    const result = await validateSucceededVideoAsset({
      asset,
      storageRoot,
      invalidate,
    });

    expect(result).toEqual({ state: "invalidated", reason: "missing" });
    expect(invalidate).toHaveBeenCalledWith({
      where: {
        id: asset.id,
        userId: asset.userId,
        videoStatus: "SUCCEEDED",
        videoStoragePath: asset.videoStoragePath,
        videoFormat: "mp4",
        videoMimeType: "video/mp4",
      },
      data: expect.objectContaining({
        videoStatus: "FAILED",
        videoError: VIDEO_FILE_MISSING_ERROR,
        videoStoragePath: null,
        videoMimeType: null,
      }),
    });
  });

  it("does not overwrite a concurrent video state change", async () => {
    const invalidate = vi.fn().mockResolvedValue({ count: 0 });
    const result = await validateSucceededVideoAsset({
      asset: candidate(path.join(storageRoot, "missing.mp4")),
      storageRoot,
      invalidate,
    });

    expect(result).toEqual({ state: "conflict", reason: "missing" });
  });
});

describe("video storage root policy", () => {
  it("rejects relative or missing production storage paths", () => {
    expect(() =>
      resolveVideoStorageRoot({
        configuredDir: "storage/videos",
        nodeEnv: "production",
        homeDir: path.join(storageRoot, "home"),
      }),
    ).toThrow(/absolute persistent-volume path/);
    expect(() =>
      resolveVideoStorageRoot({
        nodeEnv: "production",
        homeDir: path.join(storageRoot, "home"),
      }),
    ).toThrow(/must be configured/);
  });

  it("anchors development defaults and relative paths outside the process cwd", () => {
    const homeDir = path.join(storageRoot, "home");
    expect(
      resolveVideoStorageRoot({
        configuredDir: "storage/videos",
        nodeEnv: "development",
        homeDir,
      }),
    ).toBe(path.resolve(homeDir, "storage/videos"));
    expect(resolveVideoStorageRoot({ nodeEnv: "development", homeDir })).toBe(
      path.join(homeDir, ".motionpress", "ai-studio-videos"),
    );
  });
});

function candidate(videoStoragePath: string) {
  return {
    id: "animation-1",
    userId: "user-1",
    videoStoragePath,
    videoFormat: "mp4",
    videoMimeType: "video/mp4",
  };
}
