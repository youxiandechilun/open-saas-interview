import { pathToFileURL, URL } from "node:url";

export function validateProductionConfig(env) {
  const siteUrl = env.PUBLIC_SITE_URL?.trim();
  const appUrl = env.PUBLIC_APP_URL?.trim();
  const cmsUrl = env.CMS_CONTENT_API_URL?.trim();
  const offline = /^(?:1|true|yes)$/i.test(env.CMS_CONTENT_OFFLINE ?? "");
  const issues = [];

  const normalizedSiteUrl = validatePublicUrl(
    siteUrl,
    "PUBLIC_SITE_URL",
    issues,
  );
  const normalizedAppUrl = validatePublicUrl(appUrl, "PUBLIC_APP_URL", issues);

  if (offline) {
    issues.push(
      "CMS_CONTENT_OFFLINE is not allowed for production publishing.",
    );
  } else if (!cmsUrl) {
    issues.push("CMS_CONTENT_API_URL is required for production publishing.");
  } else {
    validatePublicUrl(cmsUrl, "CMS_CONTENT_API_URL", issues);
  }

  if (issues.length > 0) throw new Error(issues.join("\n"));
  return {
    siteUrl: normalizedSiteUrl,
    appUrl: normalizedAppUrl,
    cmsUrl: new URL(cmsUrl).href,
  };
}

export function validateProductionBuildConfig(env) {
  const siteUrl = env.PUBLIC_SITE_URL?.trim();
  const appUrl = env.PUBLIC_APP_URL?.trim();
  const cmsUrl = env.CMS_CONTENT_API_URL?.trim();
  const offline = /^(?:1|true|yes)$/i.test(env.CMS_CONTENT_OFFLINE ?? "");
  const issues = [];
  const normalizedSiteUrl = validatePublicUrl(
    siteUrl,
    "PUBLIC_SITE_URL",
    issues,
  );
  const normalizedAppUrl = validatePublicUrl(appUrl, "PUBLIC_APP_URL", issues);

  let normalizedCmsUrl = null;
  if (!offline) {
    if (!cmsUrl) {
      issues.push(
        "CMS_CONTENT_API_URL is required unless CMS_CONTENT_OFFLINE=1 is explicit.",
      );
    } else {
      normalizedCmsUrl = validatePublicUrl(
        cmsUrl,
        "CMS_CONTENT_API_URL",
        issues,
      );
    }
  }

  if (issues.length > 0) throw new Error(issues.join("\n"));
  return {
    siteUrl: normalizedSiteUrl,
    appUrl: normalizedAppUrl,
    cmsUrl: normalizedCmsUrl,
    offline,
  };
}

function validatePublicUrl(value, name, issues) {
  if (!value) {
    issues.push(`${name} is required for production publishing.`);
    return null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || isLocalHostname(parsed.hostname)) {
      issues.push(`${name} must be a deployed public HTTPS URL.`);
      return null;
    }
    return parsed.href;
  } catch {
    issues.push(`${name} must be a valid absolute HTTPS URL.`);
    return null;
  }
}

function isLocalHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    normalized === "your-site.com" ||
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized === "::1" ||
    normalized === "0.0.0.0" ||
    normalized.startsWith("127.") ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.")
  ) {
    return true;
  }
  const match = /^172\.(\d+)\./.exec(normalized);
  return match ? Number(match[1]) >= 16 && Number(match[1]) <= 31 : false;
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
