import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicDir = path.join(root, "public");

function originFromEnv(name, fallback) {
  const raw = process.env[name]?.trim() || fallback;
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${name} must use http or https.`);
  }
  return url.origin;
}

const siteOrigin = originFromEnv("REACT_APP_SITE_URL", "http://localhost:3000");
const blogUrl = new URL(
  process.env.REACT_APP_BLOG_URL?.trim() || "http://localhost:4321/blog/",
).href;

const robots = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /account",
  "Disallow: /admin",
  "Disallow: /ai-studio",
  "Disallow: /checkout",
  "Disallow: /email-verification",
  "Disallow: /login",
  "Disallow: /password-reset",
  "Disallow: /request-password-reset",
  "Disallow: /signup",
  "",
  `Sitemap: ${siteOrigin}/sitemap.xml`,
  "",
].join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteOrigin}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

const llms = `# MotionPress

> MotionPress is an AI animation and SEO publishing workspace for content operations teams.

MotionPress connects prompt optimization, safe HTML animation generation, MP4/WebM rendering, editorial content management, SEO quality checks, publication tasks, and AI usage governance in one observable workflow.

## Public pages

- [Home](${siteOrigin}/): Product workflow and capabilities
- [Create an account](${siteOrigin}/signup): Start a MotionPress workspace
- [Journal](${blogUrl}): Guides for AI animation and search-ready publishing
`;

await mkdir(publicDir, { recursive: true });
await Promise.all([
  writeFile(path.join(publicDir, "robots.txt"), robots, "utf8"),
  writeFile(path.join(publicDir, "sitemap.xml"), sitemap, "utf8"),
  writeFile(path.join(publicDir, "llms.txt"), llms, "utf8"),
]);

console.log(`Public SEO files generated for ${siteOrigin}.`);
