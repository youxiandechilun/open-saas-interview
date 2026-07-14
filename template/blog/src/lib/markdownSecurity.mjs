import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

const tags = new Set(defaultSchema.tagNames ?? []);
tags.delete("input");
for (const tag of ["figure", "figcaption", "video"]) tags.add(tag);

export const motionpressMarkdownSchema = {
  ...defaultSchema,
  tagNames: [...tags],
  strip: [
    ...new Set([
      ...(defaultSchema.strip ?? []),
      "script",
      "style",
      "iframe",
      "object",
      "embed",
      "form",
    ]),
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), "title", "rel"],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      "alt",
      "title",
      "width",
      "height",
      "loading",
      "decoding",
    ],
    figure: ["dataMotionpressAnimationId"],
    figcaption: [],
    video: [
      "ariaLabel",
      "controls",
      "preload",
      "playsInline",
      "muted",
      "loop",
      "poster",
      "width",
      "height",
    ],
    source: [
      ...(defaultSchema.attributes?.source ?? []),
      "src",
      "type",
      "media",
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    poster: ["http", "https"],
  },
};

// Astro appends its own raw-HTML parser after custom plugins. Parsing first
// lets the sanitizer inspect real nodes; Astro's later parser is then a no-op.
export const motionpressMarkdownRehypePlugins = [
  rehypeRaw,
  [rehypeSanitize, motionpressMarkdownSchema],
];
