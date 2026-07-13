const configuredSiteUrl =
  process.env.PUBLIC_SITE_URL?.trim() || "https://your-site.com";

export const SITE_URL = new globalThis.URL(configuredSiteUrl).href;
