import path from "node:path";
import { URL } from "node:url";

const PLACEHOLDER_HOSTS = new Set(["your-site.com", "example.com"]);

export function validateProductionConfig(env) {
  const adminEmails = requireAdminEmails(env.ADMIN_EMAILS);
  const emailProvider = env.EMAIL_PROVIDER?.trim();
  if (emailProvider !== "SendGrid") {
    throw new Error(
      "EMAIL_PROVIDER must be SendGrid for production account email delivery.",
    );
  }
  if (!env.SENDGRID_API_KEY?.trim()) {
    throw new Error("SENDGRID_API_KEY is required for production builds.");
  }

  return {
    siteUrl: requirePublicHttpsUrl(
      env.REACT_APP_SITE_URL,
      "REACT_APP_SITE_URL",
    ),
    blogUrl: requirePublicHttpsUrl(
      env.REACT_APP_BLOG_URL,
      "REACT_APP_BLOG_URL",
    ),
    videoStorageDir: requireAbsolutePersistentPath(
      env.AI_VIDEO_STORAGE_DIR,
      "AI_VIDEO_STORAGE_DIR",
    ),
    emailProvider,
    emailFromAddress: requireEmailAddress(
      env.EMAIL_FROM_ADDRESS,
      "EMAIL_FROM_ADDRESS",
    ),
    adminEmails,
  };
}

function requireAbsolutePersistentPath(value, name) {
  const normalized = value?.trim();
  if (!normalized || !path.isAbsolute(normalized)) {
    throw new Error(
      `${name} must be an absolute path mounted as a persistent volume for production builds.`,
    );
  }
  return normalized;
}

function requireAdminEmails(value) {
  const emails = (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) {
    throw new Error(
      "ADMIN_EMAILS must contain at least one bootstrap administrator email.",
    );
  }
  for (const email of emails) {
    requireEmailAddress(email, "ADMIN_EMAILS");
  }
  return [...new Set(emails)];
}

function requireEmailAddress(value, name) {
  const normalized = value?.trim();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error(`${name} must be a verified sender email address.`);
  }
  return normalized;
}

function requirePublicHttpsUrl(value, name) {
  if (!value?.trim()) {
    throw new Error(`${name} is required for production builds.`);
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute HTTPS URL.`);
  }

  if (
    url.protocol !== "https:" ||
    isLocalHostname(url.hostname) ||
    PLACEHOLDER_HOSTS.has(url.hostname.toLowerCase())
  ) {
    throw new Error(`${name} must be a deployed public HTTPS URL.`);
  }
  return url.href;
}

function isLocalHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
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
