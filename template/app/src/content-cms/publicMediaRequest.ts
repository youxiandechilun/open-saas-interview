export const CMS_PUBLIC_MEDIA_NOT_FOUND = {
  message: "Media not found",
} as const;

export function getCmsPublicMediaLookupWhere(animationId: string) {
  return {
    id: animationId,
    status: "READY" as const,
    videoStatus: "SUCCEEDED" as const,
    cmsPosts: { some: { status: "PUBLISHED" as const } },
  };
}

type CmsPublicMediaNotFoundResponse = {
  status(code: number): {
    json(body: typeof CMS_PUBLIC_MEDIA_NOT_FOUND): unknown;
  };
};

export function sendCmsPublicMediaNotFound(
  response: CmsPublicMediaNotFoundResponse,
): void {
  response.status(404).json(CMS_PUBLIC_MEDIA_NOT_FOUND);
}
