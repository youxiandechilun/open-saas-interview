import { pathToFileURL, URL } from "node:url";

export function validateProductionConfig(env) {
  const siteUrl = env.PUBLIC_SITE_URL?.trim();
  const cmsUrl = env.CMS_CONTENT_API_URL?.trim();
  const issues = [];

  if (!siteUrl) {
    issues.push("PUBLIC_SITE_URL is required for production publishing.");
  } else {
    try {
      const parsed = new URL(siteUrl);
      if (
        !/^https?:$/.test(parsed.protocol) ||
        parsed.hostname === "your-site.com"
      ) {
        issues.push("PUBLIC_SITE_URL must be the deployed HTTP(S) origin.");
      }
    } catch {
      issues.push("PUBLIC_SITE_URL must be a valid absolute URL.");
    }
  }

  if (!cmsUrl) {
    issues.push("CMS_CONTENT_API_URL is required for production publishing.");
  } else {
    try {
      const parsed = new URL(cmsUrl);
      if (!/^https?:$/.test(parsed.protocol)) {
        issues.push("CMS_CONTENT_API_URL must use HTTP(S).");
      }
    } catch {
      issues.push("CMS_CONTENT_API_URL must be a valid absolute URL.");
    }
  }

  if (issues.length > 0) throw new Error(issues.join("\n"));
  return { siteUrl: new URL(siteUrl).href, cmsUrl: new URL(cmsUrl).href };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const config = validateProductionConfig(process.env);
    console.log(`Production publication config verified for ${config.siteUrl}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
