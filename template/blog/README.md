# Starlight Starter Kit: Basics

## CMS publication and SEO contract

The blog can build from the checked-in sample Markdown posts or from the public
CMS feed. The same Starlight content collection renders both sources, so CMS
posts automatically enter Starlight's existing sitemap and canonical flow and
receive the blog Open Graph, Twitter, article, and JSON-LD metadata.

Set these environment variables in the blog build environment:

| Variable | Required | Purpose |
| :-- | :-- | :-- |
| `CMS_CONTENT_API_URL` | No | Direct URL of the public `PublishedCmsFeed` JSON endpoint. When omitted, sync runs offline and leaves local samples untouched. |
| `CMS_CONTENT_API_TOKEN` | No | Bearer token for a protected deployment feed. It is never written to generated content. |
| `CMS_CONTENT_OFFLINE` | No | Set to `true` to force offline mode even when a URL exists. |
| `PUBLIC_SITE_URL` | Production | Public origin used by Astro canonical URLs, sitemap, robots, and the SEO manifest. |

The feed shape is `{ contentVersion, updatedAt, posts }`. The adapter imports
only `PUBLISHED` posts and validates IDs, slugs, dates, authors, tags, and the
canonical `/blog/<slug>/` path. It stages all files before atomically replacing
`src/content/docs/blog/cms-generated/`; stale CMS files disappear only after a
complete successful fetch and validation. Generated runtime files are ignored
by Git.

`npm run content:publish` is the production entrypoint. It fails fast when
`PUBLIC_SITE_URL` or `CMS_CONTENT_API_URL` is missing or still a placeholder.
Its prebuild hook:

1. syncs published CMS content (or explicitly stays offline),
2. runs the SEO quality gate,
3. writes `public/blog-seo-manifest.json`, and
4. builds Astro, Starlight's sitemap, `robots.txt`, and all page metadata.

The build fails on missing descriptions, duplicate H1s, missing image alt text,
missing canonical support, or broken internal routes. Title/description length,
missing H2 sections, and missing internal links are actionable warnings. Run
`npm run seo:check` for a read-only report, `npm test` for zero-dependency Node
tests, and `npm run test:build` to recheck an existing `dist/` directory.

[![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

```
npm create astro@latest -- --template starlight
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/starlight/tree/main/examples/basics)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/starlight/tree/main/examples/basics)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro + Starlight project, you'll see the following folders and files:

```
.
├── public/
├── src/
│   ├── assets/
│   ├── content/
│   │   ├── docs/
│   │   └── config.ts
│   └── env.d.ts
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

Starlight looks for `.md` or `.mdx` files in the `src/content/docs/` directory. Each file is exposed as a route based on its file name.

Images can be added to `src/assets/` and embedded in Markdown with a relative link.

Static assets, like favicons, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Check out [Starlight’s docs](https://starlight.astro.build/), read [the Astro documentation](https://docs.astro.build), or jump into the [Astro Discord server](https://astro.build/chat).
