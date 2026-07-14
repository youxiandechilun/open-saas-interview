import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { getVideoStorageRoot } from "./videoRenderer";

export const VIDEO_FILE_MISSING_ERROR = "VIDEO_FILE_MISSING";

const VIDEO_MIME_BY_FORMAT = {
  mp4: "video/mp4",
  webm: "video/webm",
} as const;

export type StoredVideoAssetCandidate = {
  id: string;
  userId?: string;
  videoStoragePath: string | null;
  videoFormat: string | null;
  videoMimeType: string | null;
};

export type StoredVideoAssetValidation =
  | {
      ok: true;
      resolvedPath: string;
      format: keyof typeof VIDEO_MIME_BY_FORMAT;
      mimeType: (typeof VIDEO_MIME_BY_FORMAT)[keyof typeof VIDEO_MIME_BY_FORMAT];
    }
  | {
      ok: false;
      reason:
        | "missing"
        | "outside_storage"
        | "not_regular_file"
        | "metadata_mismatch";
    };

export type VideoAssetMissingCas = {
  where: {
    id: string;
    userId?: string;
    videoStatus: "SUCCEEDED";
    videoStoragePath: string | null;
    videoFormat: string | null;
    videoMimeType: string | null;
  };
  data: {
    videoStatus: "FAILED";
    videoError: typeof VIDEO_FILE_MISSING_ERROR;
    videoStoragePath: null;
    videoMimeType: null;
    videoUpdatedAt: Date;
    videoLeaseExpiresAt: null;
  };
};

export async function validateStoredVideoAsset(
  candidate: StoredVideoAssetCandidate,
  storageRoot = getVideoStorageRoot(),
): Promise<StoredVideoAssetValidation> {
  const format = candidate.videoFormat?.toLowerCase();
  if (
    (format !== "mp4" && format !== "webm") ||
    candidate.videoMimeType !== VIDEO_MIME_BY_FORMAT[format] ||
    path.extname(candidate.videoStoragePath ?? "").toLowerCase() !==
      `.${format}`
  ) {
    return { ok: false, reason: "metadata_mismatch" };
  }
  if (!candidate.videoStoragePath) return { ok: false, reason: "missing" };

  const configuredRoot = path.resolve(storageRoot);
  const configuredCandidate = path.resolve(candidate.videoStoragePath);
  if (!isPathWithin(configuredRoot, configuredCandidate)) {
    return { ok: false, reason: "outside_storage" };
  }

  try {
    const [resolvedRoot, resolvedPath] = await Promise.all([
      realpath(configuredRoot),
      realpath(configuredCandidate),
    ]);
    if (!isPathWithin(resolvedRoot, resolvedPath)) {
      return { ok: false, reason: "outside_storage" };
    }
    const file = await stat(resolvedPath);
    if (!file.isFile()) return { ok: false, reason: "not_regular_file" };
    return {
      ok: true,
      resolvedPath,
      format,
      mimeType: VIDEO_MIME_BY_FORMAT[format],
    };
  } catch {
    return { ok: false, reason: "missing" };
  }
}

export async function validateSucceededVideoAsset(input: {
  asset: StoredVideoAssetCandidate;
  storageRoot?: string;
  invalidate: (cas: VideoAssetMissingCas) => Promise<{ count: number }>;
}): Promise<
  | { state: "valid"; asset: Extract<StoredVideoAssetValidation, { ok: true }> }
  | {
      state: "invalidated" | "conflict";
      reason: Extract<StoredVideoAssetValidation, { ok: false }>["reason"];
    }
> {
  const validation = await validateStoredVideoAsset(
    input.asset,
    input.storageRoot,
  );
  if (validation.ok) return { state: "valid", asset: validation };

  const changed = await input.invalidate(
    buildVideoAssetMissingCas(input.asset),
  );
  return {
    state: changed.count > 0 ? "invalidated" : "conflict",
    reason: validation.reason,
  };
}

export function buildVideoAssetMissingCas(
  asset: StoredVideoAssetCandidate,
  now = new Date(),
): VideoAssetMissingCas {
  return {
    where: {
      id: asset.id,
      ...(asset.userId ? { userId: asset.userId } : {}),
      videoStatus: "SUCCEEDED",
      videoStoragePath: asset.videoStoragePath,
      videoFormat: asset.videoFormat,
      videoMimeType: asset.videoMimeType,
    },
    data: {
      videoStatus: "FAILED",
      videoError: VIDEO_FILE_MISSING_ERROR,
      videoStoragePath: null,
      videoMimeType: null,
      videoUpdatedAt: now,
      videoLeaseExpiresAt: null,
    },
  };
}

function isPathWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
}
