import { realpath, stat } from "node:fs/promises";
import type { GetPublishedCmsAnimationMediaApi } from "wasp/server/api";
import { isPathInsideVideoStorage } from "../ai-studio/server/videoRenderer";
import {
  CMS_PUBLIC_MEDIA_CACHE_CONTROL,
  getCmsPublicMediaDescriptor,
  isCmsPublicMediaId,
  safeCmsMediaFilename,
} from "./publicMedia";
import {
  getCmsPublicMediaLookupWhere,
  sendCmsPublicMediaNotFound,
} from "./publicMediaRequest";

export const getPublishedCmsAnimationMediaApi: GetPublishedCmsAnimationMediaApi =
  async (req, res, context) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    const animationId = String(req.params.id ?? "");
    if (!isCmsPublicMediaId(animationId)) {
      sendCmsPublicMediaNotFound(res);
      return;
    }

    const animation = await context.entities.AiAnimation.findFirst({
      where: getCmsPublicMediaLookupWhere(animationId),
      select: {
        id: true,
        title: true,
        status: true,
        videoStatus: true,
        videoFormat: true,
        videoMimeType: true,
        videoStoragePath: true,
      },
    });
    const media = getCmsPublicMediaDescriptor(animation);
    if (
      !animation?.videoStoragePath ||
      !media ||
      !isPathInsideVideoStorage(animation.videoStoragePath)
    ) {
      sendCmsPublicMediaNotFound(res);
      return;
    }

    let resolvedPath: string;
    try {
      resolvedPath = await realpath(animation.videoStoragePath);
      const file = await stat(resolvedPath);
      if (!file.isFile() || !isPathInsideVideoStorage(resolvedPath)) {
        sendCmsPublicMediaNotFound(res);
        return;
      }
    } catch {
      sendCmsPublicMediaNotFound(res);
      return;
    }

    res.setHeader("Cache-Control", CMS_PUBLIC_MEDIA_CACHE_CONTROL);
    res.setHeader("Content-Type", media.mimeType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${safeCmsMediaFilename(animation.title)}.${
        media.format
      }"`,
    );
    return res.sendFile(resolvedPath);
  };
