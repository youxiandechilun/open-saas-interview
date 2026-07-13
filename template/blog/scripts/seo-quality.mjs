import path from "node:path";

const TITLE_MIN = 30;
const TITLE_MAX = 65;
const DESCRIPTION_MIN = 120;
const DESCRIPTION_MAX = 170;

/** @param {string} value */
function stripInlineComment(value) {
  let quote = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if ((character === '"' || character === "'") && value[index - 1] !== "\\") {
      quote = quote === character ? "" : quote || character;
    }
    if (
      character === "#" &&
      !quote &&
      (index === 0 || /\s/.test(value[index - 1]))
    ) {
      return value.slice(0, index).trimEnd();
    }
  }
  return value.trimEnd();
}

/** @param {string} value */
function parseScalar(value) {
  const clean = stripInlineComment(value.trim());
  if (clean.startsWith("[") && clean.endsWith("]")) {
    return splitInlineList(clean.slice(1, -1)).map(parseScalar);
  }
  if (clean.startsWith('"') && clean.endsWith('"')) {
    try {
      return JSON.parse(clean);
    } catch {
      return clean.slice(1, -1);
    }
  }
  if (clean.startsWith("'") && clean.endsWith("'")) {
    return clean.slice(1, -1).replaceAll("''", "'");
  }
  if (/^true$/i.test(clean)) return true;
  if (/^false$/i.test(clean)) return false;
  if (clean === "null" || clean === "~") return null;
  return clean;
}

/** @param {string} value */
function splitInlineList(value) {
  const items = [];
  let current = "";
  let quote = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if ((character === '"' || character === "'") && value[index - 1] !== "\\") {
      quote = quote === character ? "" : quote || character;
    }
    if (character === "," && !quote) {
      items.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  if (current.trim()) items.push(current.trim());
  return items;
}

/** @param {string} file */
export function routeFromFile(file) {
  let slug = file.replaceAll("\\", "/").replace(/^.*?content\/docs\//, "");
  slug = slug.replace(/\.(?:md|mdx)$/i, "");
  if (slug === "index") return "/";
  slug = slug.replace(/\/index$/, "");
  return `/${slug.replace(/^\/+|\/+$/g, "")}/`;
}

/**
 * Parse the top-level frontmatter values used by the SEO pipeline. Astro still
 * performs the authoritative schema validation during the build.
 *
 * @param {string} source
 * @param {string} file
 */
export function parseMarkdownDocument(source, file) {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  const frontmatter = {};
  const rawFrontmatter = match?.[1] ?? "";
  const lines = rawFrontmatter.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const field = line.match(/^([A-Za-z][\w-]*):(?:\s*(.*))?$/);
    if (!field) continue;
    const [, key, rawValue = ""] = field;

    if (rawValue === ">" || rawValue === "|") {
      const block = [];
      while (lines[index + 1] && /^\s+/.test(lines[index + 1])) {
        block.push(lines[index + 1].trim());
        index += 1;
      }
      frontmatter[key] = block.join(rawValue === ">" ? " " : "\n");
    } else {
      frontmatter[key] = parseScalar(rawValue);
    }
  }

  const frontmatterSlug =
    typeof frontmatter.slug === "string"
      ? frontmatter.slug.replace(/^\/+|\/+$/g, "")
      : "";

  return {
    file: file.replaceAll("\\", "/"),
    route: frontmatterSlug ? `/${frontmatterSlug}/` : routeFromFile(file),
    frontmatter,
    body: match ? source.slice(match[0].length) : source,
    source,
  };
}

/** @param {string} body */
function withoutFencedCode(body) {
  return body.replace(/^(?:```|~~~)[\s\S]*?^(?:```|~~~)\s*$/gm, "");
}

/** @param {string} href */
function isInternalHref(href) {
  return !/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href);
}

/** @param {string} href @param {string} route */
function normalizeInternalRoute(href, route) {
  const pathname = new globalThis.URL(href, `https://seo-check.local${route}`)
    .pathname;
  if (path.extname(pathname)) return pathname;
  return pathname === "/" ? pathname : `${pathname.replace(/\/+$/, "")}/`;
}

/**
 * @param {ReturnType<typeof parseMarkdownDocument>} document
 * @param {{knownRoutes?: Set<string>, frameworkCanonical?: boolean, frameworkH1?: boolean}} [options]
 */
export function checkPostQuality(document, options = {}) {
  const knownRoutes = options.knownRoutes ?? new Set();
  const frameworkCanonical = options.frameworkCanonical ?? true;
  const frameworkH1 = options.frameworkH1 ?? true;
  const body = withoutFencedCode(document.body);
  const title = String(document.frontmatter.title ?? "").trim();
  const description = String(
    document.frontmatter.description ?? document.frontmatter.excerpt ?? "",
  ).trim();
  const explicitH1Count =
    (body.match(/^#\s+.+$/gm) ?? []).length +
    (body.match(/<h1(?:\s|>)/gi) ?? []).length;
  const h2Count =
    (body.match(/^##\s+.+$/gm) ?? []).length +
    (body.match(/<h2(?:\s|>)/gi) ?? []).length;
  const markdownImages = [...body.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
  const htmlImages = [...body.matchAll(/<img\b([^>]*)>/gi)];
  const imagesWithoutAlt =
    markdownImages.filter((image) => image[1].trim().length === 0).length +
    htmlImages.filter((image) => !/\balt\s*=\s*(["']).+?\1/i.test(image[1]))
      .length;
  const bodyWithoutImages = body.replace(/!\[[^\]]*\]\([^)]+\)/g, "");
  const markdownLinks = [
    ...bodyWithoutImages.matchAll(/\[[^\]]+\]\(([^)\s]+)(?:\s+[^)]*)?\)/g),
  ].map((match) => match[1]);
  const htmlLinks = [
    ...bodyWithoutImages.matchAll(
      /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>/gi,
    ),
  ].map((match) => match[2].trim());
  const links = [...markdownLinks, ...htmlLinks];
  const internalLinks = links.filter(isInternalHref);
  const brokenInternalLinks = internalLinks
    .map((href) => ({
      href,
      route: normalizeInternalRoute(href, document.route),
    }))
    .filter(({ route }) => knownRoutes.size > 0 && !knownRoutes.has(route));
  const canonicalSource = document.frontmatter.canonical
    ? "frontmatter"
    : frameworkCanonical
      ? "framework"
      : "missing";
  const issues = [];
  const addIssue = (rule, severity, message, suggestion) => {
    issues.push({ rule, severity, message, suggestion });
  };

  if (!title) {
    addIssue(
      "title",
      "error",
      "The post has no title.",
      "Add a specific title in frontmatter.",
    );
  } else if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    addIssue(
      "title-length",
      "warning",
      `The title is ${title.length} characters; aim for ${TITLE_MIN}-${TITLE_MAX}.`,
      "Rewrite the title so the main search intent remains visible in result pages.",
    );
  }

  const publicationDate = new Date(String(document.frontmatter.date ?? ""));
  if (!document.frontmatter.date || Number.isNaN(publicationDate.getTime())) {
    addIssue(
      "publication-date",
      "error",
      "The published post has no valid publication date.",
      "Add a valid YAML date to the frontmatter before publishing.",
    );
  }

  if (!description) {
    addIssue(
      "description",
      "error",
      "The post has no SEO description.",
      "Add a unique description (or excerpt) that summarizes the reader outcome.",
    );
  } else if (
    description.length < DESCRIPTION_MIN ||
    description.length > DESCRIPTION_MAX
  ) {
    addIssue(
      "description-length",
      "warning",
      `The description is ${description.length} characters; aim for ${DESCRIPTION_MIN}-${DESCRIPTION_MAX}.`,
      "Tighten the description to a single useful search-result summary.",
    );
  }

  if (frameworkH1 && explicitH1Count > 0) {
    addIssue(
      "h1",
      "error",
      "Markdown adds an H1 even though Starlight renders the title as H1.",
      "Remove Markdown H1 headings and begin article sections at H2.",
    );
  } else if (!frameworkH1 && explicitH1Count !== 1) {
    addIssue(
      "h1",
      "error",
      `Expected one H1, found ${explicitH1Count}.`,
      "Render exactly one page-level H1.",
    );
  }

  if (h2Count === 0) {
    addIssue(
      "h2",
      "warning",
      "The post has no H2 sections.",
      "Split the article into descriptive H2 sections.",
    );
  }
  if (canonicalSource === "missing") {
    addIssue(
      "canonical",
      "error",
      "No canonical URL source is configured.",
      "Provide a canonical link in the framework head or page frontmatter.",
    );
  }
  if (imagesWithoutAlt > 0) {
    addIssue(
      "image-alt",
      "error",
      `${imagesWithoutAlt} image(s) have no meaningful alt text.`,
      "Describe the visible content or purpose of each informative image.",
    );
  }
  if (internalLinks.length === 0) {
    addIssue(
      "internal-link",
      "warning",
      "The post has no internal links.",
      "Link to at least one relevant guide, article, or product page.",
    );
  }
  for (const link of brokenInternalLinks) {
    addIssue(
      "internal-link",
      "error",
      `Internal link '${link.href}' does not match a known route.`,
      `Update the link or add the missing '${link.route}' page.`,
    );
  }

  return {
    file: document.file,
    route: document.route,
    published: document.frontmatter.draft !== true,
    metrics: {
      titleLength: title.length,
      descriptionLength: description.length,
      h1Count: explicitH1Count + (frameworkH1 ? 1 : 0),
      h2Count,
      canonicalSource,
      imageCount: markdownImages.length + htmlImages.length,
      imagesWithoutAlt,
      internalLinkCount: internalLinks.length,
    },
    issues,
  };
}

/**
 * @param {ReturnType<typeof parseMarkdownDocument>[]} documents
 * @param {{siteUrl: string}} options
 */
export function buildSeoManifest(documents, { siteUrl }) {
  const posts = documents
    .filter((document) => document.frontmatter.draft !== true)
    .map((document) => {
      const published = new Date(String(document.frontmatter.date));
      const modifiedValue = document.frontmatter.lastUpdated;
      const modified =
        modifiedValue && modifiedValue !== true
          ? new Date(String(modifiedValue))
          : undefined;
      return {
        route: document.route,
        canonical: new globalThis.URL(document.route, siteUrl).href,
        title: String(document.frontmatter.title ?? ""),
        description: String(
          document.frontmatter.description ??
            document.frontmatter.excerpt ??
            "",
        ),
        publishedAt: Number.isNaN(published.getTime())
          ? null
          : published.toISOString(),
        modifiedAt:
          modified && !Number.isNaN(modified.getTime())
            ? modified.toISOString()
            : null,
        tags: Array.isArray(document.frontmatter.tags)
          ? document.frontmatter.tags
          : [],
      };
    })
    .sort((left, right) => left.route.localeCompare(right.route));

  return { version: 1, posts };
}
