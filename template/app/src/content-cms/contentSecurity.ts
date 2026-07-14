import sanitizeHtml from "sanitize-html";

const CMS_ALLOWED_TAGS = [
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "del",
  "details",
  "div",
  "em",
  "figcaption",
  "figure",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "source",
  "span",
  "strong",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
  "video",
] as const;

const CMS_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "title"],
  img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
  video: [
    "controls",
    "preload",
    "playsinline",
    "muted",
    "loop",
    "poster",
    "width",
    "height",
  ],
  source: ["src", "type", "media"],
  figure: ["data-motionpress-animation-id"],
  th: ["colspan", "rowspan", "scope"],
  td: ["colspan", "rowspan"],
  details: ["open"],
};

/**
 * Markdown remains plain text to this parser; only embedded HTML is reduced to
 * the small editorial allowlist before it can reach storage or the public feed.
 */
export function sanitizeCmsMarkdown(content: string): string {
  return sanitizeHtml(content, {
    allowedTags: [...CMS_ALLOWED_TAGS],
    allowedAttributes: CMS_ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href", "src", "poster"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
    parseStyleAttributes: false,
  });
}
