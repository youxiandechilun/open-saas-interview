import { access } from "node:fs/promises";
import path from "node:path";
import type { DownloadAiAnimationVideo } from "wasp/server/api";
import { isPathInsideVideoStorage } from "./videoRenderer";

export const downloadAiAnimationVideo: DownloadAiAnimationVideo = async (
  req,
  res,
  context,
) => {
  if (!context.user)
    return res.status(401).json({ message: "Authentication required" });
  const animationId = String(req.params.id ?? "");
  const animation = await context.entities.AiAnimation.findFirst({
    where: {
      id: animationId,
      userId: context.user.id,
      videoStatus: "SUCCEEDED",
    },
  });
  if (
    !animation?.videoStoragePath ||
    !isPathInsideVideoStorage(animation.videoStoragePath)
  ) {
    return res.status(404).json({ message: "Video not found" });
  }

  try {
    await access(animation.videoStoragePath);
  } catch {
    return res.status(404).json({ message: "Video file is unavailable" });
  }

  const extension = animation.videoFormat === "mp4" ? "mp4" : "webm";
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.download(
    animation.videoStoragePath,
    `${safeFilename(animation.title)}.${extension}`,
  );
};

function safeFilename(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || path.basename("animation");
}
