import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseMarkdownDocument } from "./seo-quality.mjs";

const BLOG_ROOT = fileURLToPath(
  new globalThis.URL("../src/content/docs/blog/", import.meta.url),
);
export const GENERATED_CONTENT_DIR = path.join(BLOG_ROOT, "cms-generated");
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_PUBLIC_MEDIA_PATH =
  /^\/content-cms\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VIDEO_MIME_BY_FORMAT = {
  mp4: "video/mp4",
  webm: "video/webm",
};

/** @param {unknown} value @param {string} field */
function requireString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`CMS post has an invalid ${field}.`);
  }
  return value.trim();
}

/** @param {unknown} value @param {string} field */
function requireDate(value, field) {
  const raw = requireString(value, field);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime()))
    throw new Error(`CMS post has an invalid ${field}.`);
  return parsed.toISOString();
}

function normalizePublishedAnimation(animation, mediaBaseUrl) {
  if (animation == null) return null;
  if (typeof animation !== "object" || Array.isArray(animation)) {
    throw new Error("CMS post has an invalid animation.");
  }

  const id = requireString(animation.id, "animation id");
  const title = requireString(animation.title, "animation title");
  const description =
    typeof animation.description === "string" && animation.description.trim()
      ? animation.description.trim()
      : null;
  const status = requireString(animation.status, "animation status");
  const videoStatus = requireString(
    animation.videoStatus,
    "animation video status",
  );
  const publicMediaPath = animation.publicMediaPath;
  if (publicMediaPath == null) {
    return {
      id,
      title,
      description,
      status,
      videoStatus,
      videoFormat: null,
      videoMimeType: null,
      publicMediaPath: null,
      publicMediaUrl: null,
    };
  }

  const mediaPath = requireString(publicMediaPath, "animation media path");
  const format = requireString(animation.videoFormat, "animation video format");
  const mimeType = requireString(
    animation.videoMimeType,
    "animation video MIME type",
  );
  if (
    status !== "READY" ||
    videoStatus !== "SUCCEEDED" ||
    !SAFE_PUBLIC_MEDIA_PATH.test(mediaPath) ||
    VIDEO_MIME_BY_FORMAT[format] !== mimeType
  ) {
    throw new Error(`CMS animation '${id}' has unsafe public media metadata.`);
  }

  let publicMediaUrl = mediaPath;
  if (mediaBaseUrl) {
    const base = new globalThis.URL(mediaBaseUrl);
    if (!/^https?:$/.test(base.protocol)) {
      throw new Error("CMS media base URL must use HTTP(S).");
    }
    publicMediaUrl = new globalThis.URL(mediaPath, base.origin).href;
  }

  return {
    id,
    title,
    description,
    status,
    videoStatus,
    videoFormat: format,
    videoMimeType: mimeType,
    publicMediaPath: mediaPath,
    publicMediaUrl,
  };
}

/**
 * Validate the public feed at the Astro boundary rather than trusting a remote
 * payload to become source files.
 *
 * @param {unknown} payload
 * @param {{mediaBaseUrl?: string}} [options]
 */
export function normalizePublishedFeed(payload, options = {}) {
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray(payload.posts)
  ) {
    throw new Error(
      "CMS content API must return an object with a posts array.",
    );
  }

  const posts = payload.posts
    .filter((post) => post?.status === "PUBLISHED")
    .map((post) => {
      const slug = requireString(post.slug, "slug");
      if (!SAFE_SLUG.test(slug))
        throw new Error(`CMS post has an invalid slug: '${slug}'.`);

      const canonicalPath = post.canonicalPath ?? `/blog/${slug}/`;
      if (canonicalPath !== `/blog/${slug}/`) {
        throw new Error(
          `CMS post '${slug}' has canonicalPath '${canonicalPath}', expected '/blog/${slug}/'.`,
        );
      }

      const authorName = requireString(post.author?.name, "author name");
      const tags = Array.isArray(post.tags)
        ? post.tags.map((tag) => requireString(tag?.name, "tag name"))
        : [];

      return {
        id: requireString(post.id, "id"),
        title: requireString(post.title, "title"),
        slug,
        excerpt: requireString(post.excerpt, "excerpt"),
        content: requireString(post.content, "content").replaceAll(
          "\r\n",
          "\n",
        ),
        status: "PUBLISHED",
        publishedAt: requireDate(post.publishedAt, "publishedAt"),
        updatedAt: requireDate(post.updatedAt ?? post.publishedAt, "updatedAt"),
        author: { name: authorName },
        tags,
        animation: normalizePublishedAnimation(
          post.animation,
          options.mediaBaseUrl,
        ),
        canonicalPath,
      };
    });

  const seenSlugs = new Set();
  for (const post of posts) {
    if (seenSlugs.has(post.slug))
      throw new Error(`CMS feed contains duplicate slug '${post.slug}'.`);
    seenSlugs.add(post.slug);
  }

  posts.sort((left, right) => left.slug.localeCompare(right.slug));
  return {
    contentVersion:
      typeof payload.contentVersion === "string"
        ? payload.contentVersion
        : "unversioned",
    updatedAt:
      typeof payload.updatedAt === "string" &&
      !Number.isNaN(new Date(payload.updatedAt).getTime())
        ? new Date(payload.updatedAt).toISOString()
        : null,
    posts,
  };
}

/** @param {ReturnType<typeof normalizePublishedFeed>["posts"][number]} post */
export function renderCmsPost(post) {
  const quote = (value) => JSON.stringify(value);
  return [
    "---",
    "# Generated from the CMS public feed. Do not edit by hand.",
    `slug: ${quote(post.canonicalPath.replace(/^\/+|\/+$/g, ""))}`,
    `title: ${quote(post.title)}`,
    `description: ${quote(post.excerpt)}`,
    `excerpt: ${quote(post.excerpt)}`,
    `date: ${post.publishedAt}`,
    `lastUpdated: ${post.updatedAt}`,
    `authors: ${JSON.stringify([post.author])}`,
    `tags: ${JSON.stringify(post.tags)}`,
    "---",
    "",
    ...renderCmsAnimation(post.animation),
    post.content,
    "",
  ].join("\n");
}

function renderCmsAnimation(animation) {
  if (!animation?.publicMediaUrl) return [];
  const title = escapeHtml(animation.title);
  const description = animation.description
    ? `<br />${escapeHtml(animation.description)}`
    : "";
  return [
    `<figure data-motionpress-animation-id="${escapeHtml(animation.id)}">`,
    `  <video controls preload="metadata" playsinline aria-label="${title}">`,
    `    <source src="${escapeHtml(animation.publicMediaUrl)}" type="${escapeHtml(animation.videoMimeType)}" />`,
    "    Your browser does not support embedded video.",
    "  </video>",
    `  <figcaption><strong>${title}</strong>${description}</figcaption>`,
    "</figure>",
    "",
  ];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function pathExists(candidate) {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}

/**
 * Replace only the dedicated generated directory. A staging rename prevents a
 * partial feed from leaving a half-published site.
 *
 * @param {{targetDir: string, posts: ReturnType<typeof normalizePublishedFeed>["posts"]}} input
 */
export async function replaceGeneratedContent({ targetDir, posts }) {
  const target = path.resolve(targetDir);
  if (path.basename(target) !== "cms-generated") {
    throw new Error(
      `Refusing to replace unsafe CMS output directory '${target}'.`,
    );
  }

  const parent = path.dirname(target);
  const nonce = `${process.pid}-${Date.now()}`;
  const staging = path.join(parent, `.cms-generated-staging-${nonce}`);
  const backup = path.join(parent, `.cms-generated-backup-${nonce}`);
  await mkdir(parent, { recursive: true });
  await mkdir(staging, { recursive: false });

  try {
    for (const post of [...posts].sort((left, right) =>
      left.slug.localeCompare(right.slug),
    )) {
      await writeFile(
        path.join(staging, `${post.slug}.md`),
        renderCmsPost(post),
        {
          encoding: "utf8",
          flag: "wx",
        },
      );
    }
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }

  const hadTarget = await pathExists(target);
  try {
    if (hadTarget) await rename(target, backup);
    await rename(staging, target);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    if (hadTarget && (await pathExists(backup))) await rename(backup, target);
    throw error;
  }

  if (hadTarget) await rm(backup, { recursive: true, force: true });
}

async function localMarkdownFiles(directory, excludedDirectory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const candidate = path.join(directory, entry.name);
    if (path.resolve(candidate) === path.resolve(excludedDirectory)) continue;
    if (entry.name.startsWith(".cms-generated-")) continue;
    if (entry.isDirectory()) {
      files.push(...(await localMarkdownFiles(candidate, excludedDirectory)));
    } else if (entry.isFile() && /\.mdx?$/i.test(entry.name)) {
      files.push(candidate);
    }
  }
  return files;
}

async function assertNoLocalRouteCollisions(posts, targetDir) {
  const blogRoot = path.dirname(path.resolve(targetDir));
  const localRoutes = new Map();
  for (const file of await localMarkdownFiles(blogRoot, targetDir)) {
    const relative = path.relative(blogRoot, file).replaceAll("\\", "/");
    const document = parseMarkdownDocument(
      await readFile(file, "utf8"),
      `blog/${relative}`,
    );
    localRoutes.set(document.route, relative);
  }

  for (const post of posts) {
    const owner = localRoutes.get(post.canonicalPath);
    if (owner) {
      throw new Error(
        `CMS post '${post.slug}' conflicts with checked-in post '${owner}' at '${post.canonicalPath}'.`,
      );
    }
  }
}

/**
 * @param {{targetDir?: string, url?: string, offline?: boolean, token?: string, fetchImpl?: typeof fetch}} [options]
 */
export async function syncCmsContent(options = {}) {
  const targetDir = options.targetDir ?? GENERATED_CONTENT_DIR;
  const url = options.url?.trim();
  if (options.offline) {
    // Offline builds must not inherit content from a previous online sync.
    await replaceGeneratedContent({ targetDir, posts: [] });
    return { mode: "offline", imported: 0, contentVersion: null };
  }
  if (!url) {
    throw new Error(
      "CMS_CONTENT_API_URL is required unless CMS_CONTENT_OFFLINE=1 is explicit.",
    );
  }

  const headers = { Accept: "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const response = await (options.fetchImpl ?? globalThis.fetch)(url, {
    headers,
    signal: globalThis.AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(
      `CMS content API request failed with HTTP ${response.status}.`,
    );
  }

  const feed = normalizePublishedFeed(await response.json(), {
    mediaBaseUrl: new globalThis.URL(url).origin,
  });
  await assertNoLocalRouteCollisions(feed.posts, targetDir);
  await replaceGeneratedContent({ targetDir, posts: feed.posts });
  return {
    mode: "online",
    imported: feed.posts.length,
    contentVersion: feed.contentVersion,
  };
}

async function runCli() {
  const offline = /^(?:1|true|yes)$/i.test(
    process.env.CMS_CONTENT_OFFLINE ?? "",
  );
  const result = await syncCmsContent({
    url: process.env.CMS_CONTENT_API_URL,
    token: process.env.CMS_CONTENT_API_TOKEN,
    offline,
  });
  if (result.mode === "offline") {
    console.log(
      "CMS sync: offline mode; generated CMS content was reset while checked-in posts were left unchanged.",
    );
  } else {
    console.log(
      `CMS sync: imported ${result.imported} published post(s) (${result.contentVersion}).`,
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runCli().catch((error) => {
    console.error(`CMS sync failed: ${error.message}`);
    process.exitCode = 1;
  });
}
