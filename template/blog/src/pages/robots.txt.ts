import type { APIRoute } from "astro";

import { SITE_URL } from "../lib/site.mjs";

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const publicSite = site ?? new URL(SITE_URL);
  const sitemapUrl = new URL("/sitemap-index.xml", publicSite);

  return new Response(
    [`User-agent: *`, `Allow: /`, `Sitemap: ${sitemapUrl.href}`, ""].join("\n"),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
};
