export const CMS_PUBLIC_MEDIA_ROUTE_PREFIX = "/content-cms/media";
export const CMS_PUBLIC_MEDIA_CACHE_CONTROL =
  "public, max-age=0, must-revalidate";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VIDEO_MIME_BY_FORMAT = {
  mp4: "video/mp4",
  webm: "video/webm",
} as const;

type CmsPublicMediaCandidate = {
  id: string;
  status: string;
  videoStatus: string;
  videoFormat: string | null;
  videoMimeType: string | null;
};

export type CmsPublicMediaDescriptor = {
  path: string;
  format: keyof typeof VIDEO_MIME_BY_FORMAT;
  mimeType: (typeof VIDEO_MIME_BY_FORMAT)[keyof typeof VIDEO_MIME_BY_FORMAT];
};

export function isCmsPublicMediaId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function getCmsPublicMediaDescriptor(
  animation: CmsPublicMediaCandidate | null,
): CmsPublicMediaDescriptor | null {
  if (
    !animation ||
    !isCmsPublicMediaId(animation.id) ||
    animation.status !== "READY" ||
    animation.videoStatus !== "SUCCEEDED"
  ) {
    return null;
  }

  const format = animation.videoFormat?.toLowerCase();
  if (format !== "mp4" && format !== "webm") return null;
  const mimeType = VIDEO_MIME_BY_FORMAT[format];
  if (animation.videoMimeType !== mimeType) return null;

  return {
    path: `${CMS_PUBLIC_MEDIA_ROUTE_PREFIX}/${animation.id}`,
    format,
    mimeType,
  };
}

export function safeCmsMediaFilename(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || "animation";
}
