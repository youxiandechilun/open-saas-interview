import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  normalizePublishedFeed,
  renderCmsPost,
  replaceGeneratedContent,
  syncCmsContent,
} from "../scripts/cms-sync.mjs";
import { parseMarkdownDocument } from "../scripts/seo-quality.mjs";

const cmsPost = {
  id: "post_1",
  title: "A practical content operations guide",
  slug: "content-operations-guide",
  excerpt:
    "Learn how a small team can publish useful articles with predictable review, validation, and delivery steps.",
  content:
    "## Begin with ownership\n\nAssign one owner to every publication step.",
  status: "PUBLISHED",
  publishedAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-02T00:00:00.000Z",
  author: { id: "author_1", name: "Ada", slug: "ada" },
  tags: [{ id: "tag_1", name: "Operations", slug: "operations" }],
  canonicalPath: "/blog/content-operations-guide/",
};

test("CMS feed adapter imports only valid PUBLISHED posts", () => {
  const feed = normalizePublishedFeed({
    contentVersion: "v3",
    updatedAt: "2026-07-02T00:00:00.000Z",
    posts: [
      cmsPost,
      { ...cmsPost, id: "draft_1", slug: "draft", status: "DRAFT" },
    ],
  });

  assert.equal(feed.contentVersion, "v3");
  assert.equal(feed.posts.length, 1);
  assert.equal(feed.posts[0].slug, "content-operations-guide");
  assert.throws(
    () =>
      normalizePublishedFeed({
        posts: [
          { ...cmsPost, slug: "../escape", canonicalPath: "/blog/../escape/" },
        ],
      }),
    /invalid slug/i,
  );
});

test("CMS Markdown uses the canonical slug and escapes frontmatter values", () => {
  const markdown = renderCmsPost({
    ...cmsPost,
    title: 'A title with "quotes" and: syntax',
  });
  const document = parseMarkdownDocument(
    markdown,
    "blog/cms-generated/content-operations-guide.md",
  );

  assert.equal(document.route, "/blog/content-operations-guide/");
  assert.equal(document.frontmatter.title, 'A title with "quotes" and: syntax');
  assert.match(markdown, /^date: 2026-07-01T00:00:00\.000Z$/m);
  assert.match(markdown, /^lastUpdated: 2026-07-02T00:00:00\.000Z$/m);
  assert.match(markdown, /## Begin with ownership/);
});

test("generated CMS directory replacement removes stale output deterministically", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "open-saas-cms-sync-"));
  const target = path.join(root, "cms-generated");

  try {
    await replaceGeneratedContent({ targetDir: target, posts: [cmsPost] });
    await writeFile(path.join(target, "stale.md"), "stale", "utf8");
    await replaceGeneratedContent({
      targetDir: target,
      posts: [
        { ...cmsPost, slug: "new-post", canonicalPath: "/blog/new-post/" },
      ],
    });

    assert.deepEqual(await readdir(target), ["new-post.md"]);
    assert.match(
      await readFile(path.join(target, "new-post.md"), "utf8"),
      /slug: "blog\/new-post"/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("offline CMS sync leaves existing local content untouched", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "open-saas-cms-offline-"));
  const target = path.join(root, "cms-generated");

  try {
    await replaceGeneratedContent({ targetDir: target, posts: [cmsPost] });
    const before = await readFile(
      path.join(target, `${cmsPost.slug}.md`),
      "utf8",
    );
    const result = await syncCmsContent({
      targetDir: target,
      url: "",
      offline: true,
    });
    const after = await readFile(
      path.join(target, `${cmsPost.slug}.md`),
      "utf8",
    );

    assert.equal(result.mode, "offline");
    assert.equal(after, before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("online CMS sync sends optional auth and installs the validated feed", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "open-saas-cms-online-"));
  const target = path.join(root, "cms-generated");
  let request;

  try {
    const result = await syncCmsContent({
      targetDir: target,
      url: "https://cms.example.test/public/posts",
      token: "test-token",
      fetchImpl: async (url, options) => {
        request = { url, options };
        return {
          ok: true,
          status: 200,
          json: async () => ({ contentVersion: "v4", posts: [cmsPost] }),
        };
      },
    });

    assert.equal(request.url, "https://cms.example.test/public/posts");
    assert.equal(request.options.headers.Authorization, "Bearer test-token");
    assert.equal(result.mode, "online");
    assert.equal(result.imported, 1);
    assert.equal(result.contentVersion, "v4");
    assert.match(
      await readFile(path.join(target, `${cmsPost.slug}.md`), "utf8"),
      /^title:/m,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("online CMS sync rejects checked-in route collisions", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "open-saas-cms-collision-"),
  );
  const target = path.join(root, "cms-generated");

  try {
    await writeFile(
      path.join(root, `${cmsPost.slug}.md`),
      `---\ntitle: Existing post\n---\n`,
      "utf8",
    );
    await assert.rejects(
      syncCmsContent({
        targetDir: target,
        url: "https://cms.example.test/public/posts",
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ contentVersion: "v5", posts: [cmsPost] }),
        }),
      }),
      /conflicts with checked-in post/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
