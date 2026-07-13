export const siteSeo = {
  name: "Your Open SaaS App",
  origin: "https://your-saas-app.com",
  defaultDescription: "Your app's main description and features.",
  imagePath: "/public-banner.webp",
  imageAlt: "Your Open SaaS App product preview",
} as const;

export function getCanonicalUrl(pathname: string): string {
  const normalizedPath =
    pathname === "/" ? "/" : `/${pathname.replace(/^\/+|\/+$/g, "")}`;
  return new URL(normalizedPath, siteSeo.origin).href;
}

export function getSocialImageUrl(): string {
  return new URL(siteSeo.imagePath, siteSeo.origin).href;
}
