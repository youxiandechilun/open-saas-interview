import path from "node:path";
import type { DownloadAiAnimationVideo } from "wasp/server/api";
import { validateSucceededVideoAsset } from "./videoAsset";

export const downloadAiAnimationVideo: DownloadAiAnimationVideo = async (
  req,
  res,
  context,
) => {
  if (!context.user)
    return res.status(401).json({ message: "Authentication required" });
  if (context.user.isDisabled) {
    return res.status(403).json({ message: "This account is disabled" });
  }
  const animationId = String(req.params.id ?? "");
  const animation = await context.entities.AiAnimation.findFirst({
    where: {
      id: animationId,
      userId: context.user.id,
      videoStatus: "SUCCEEDED",
    },
  });
  if (!animation) {
    return res.status(404).json({ message: "Video not found" });
  }

  const storedVideo = await validateSucceededVideoAsset({
    asset: animation,
    invalidate: (cas) => context.entities.AiAnimation.updateMany(cas),
  });
  if (storedVideo.state !== "valid") {
    return res.status(404).json({ message: "Video file is unavailable" });
  }

  const extension = animation.videoFormat === "mp4" ? "mp4" : "webm";
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.download(
    storedVideo.asset.resolvedPath,
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
