export function getCmsPublicUrl(
  blogBaseUrl: string | undefined,
  slug: string,
): string {
  const normalizedSlug = slug.replace(/^\/+|\/+$/g, "");
  const rawBase = blogBaseUrl?.trim() || "/blog/";
  const baseWithSlash = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;

  if (/^https?:\/\//i.test(baseWithSlash)) {
    return new URL(`${normalizedSlug}/`, baseWithSlash).href;
  }

  const basePath = `/${baseWithSlash.replace(/^\/+|\/+$/g, "")}/`;
  return `${basePath}${normalizedSlug}/`.replace(/\/{2,}/g, "/");
}
