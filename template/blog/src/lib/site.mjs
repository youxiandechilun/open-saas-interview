const explicitSiteUrl = process.env.PUBLIC_SITE_URL?.trim();
const isAstroBuild = process.argv.some((argument) => argument === "build");

if (isAstroBuild) {
  if (!explicitSiteUrl) {
    throw new Error("PUBLIC_SITE_URL is required for Astro production builds.");
  }
  const productionUrl = new globalThis.URL(explicitSiteUrl);
  if (
    productionUrl.protocol !== "https:" ||
    productionUrl.hostname === "localhost" ||
    productionUrl.hostname.startsWith("127.")
  ) {
    throw new Error(
      "PUBLIC_SITE_URL must be a deployed public HTTPS URL for Astro builds.",
    );
  }
}

const configuredSiteUrl = explicitSiteUrl || "http://localhost:4321";

export const SITE_URL = new globalThis.URL(configuredSiteUrl).href;
