const fallbackSiteOrigin = "http://localhost:3000";
const configuredSiteOrigin = import.meta.env.REACT_APP_SITE_URL?.trim();

export function normalizeSiteOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("REACT_APP_SITE_URL must use http or https.");
  }
  return url.origin;
}

if (import.meta.env.PROD) {
  if (!configuredSiteOrigin) {
    throw new Error("REACT_APP_SITE_URL is required for production builds.");
  }
  const productionUrl = new URL(configuredSiteOrigin);
  if (
    productionUrl.protocol !== "https:" ||
    productionUrl.hostname === "localhost" ||
    productionUrl.hostname.startsWith("127.")
  ) {
    throw new Error(
      "REACT_APP_SITE_URL must be a deployed public HTTPS URL in production.",
    );
  }
}

export const siteSeo = {
  name: "MotionPress",
  origin: normalizeSiteOrigin(configuredSiteOrigin || fallbackSiteOrigin),
  defaultDescription:
    "Create AI-assisted HTML animations, render video, and publish search-ready content from one operational workspace.",
  imagePath: "/motionpress-social.png",
  imageAlt: "MotionPress animation and publishing workspace",
} as const;

export function getCanonicalUrl(pathname: string): string {
  const normalizedPath =
    pathname === "/" ? "/" : `/${pathname.replace(/^\/+|\/+$/g, "")}`;
  return new URL(normalizedPath, siteSeo.origin).href;
}

export function getSocialImageUrl(): string {
  return new URL(siteSeo.imagePath, siteSeo.origin).href;
}
