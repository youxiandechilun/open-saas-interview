import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";

const blogRoot = fileURLToPath(new URL("../", import.meta.url));
const postsRoot = path.join(blogRoot, "src", "content", "docs", "blog");

test("checked-in posts use renderer-compatible Markdown and durable assets", async () => {
  const postNames = (await readdir(postsRoot)).filter((name) =>
    name.endsWith(".md"),
  );

  for (const postName of postNames) {
    const source = await readFile(path.join(postsRoot, postName), "utf8");
    assert.doesNotMatch(
      source,
      /{%\s*(?:embed|cta|endcta)\b/i,
      `${postName} contains an unsupported Liquid shortcode`,
    );
    assert.doesNotMatch(
      source,
      /res\.cloudinary\.com\/practicaldev/i,
      `${postName} depends on the retired Cloudinary proxy`,
    );
  }

  const defaultBanner = path.join(
    blogRoot,
    "public",
    "banner-images",
    "default-banner.webp",
  );
  await access(defaultBanner);
});

test("Starlight navigation and metadata use the MotionPress product surface", async () => {
  const config = await readFile(
    path.join(blogRoot, "astro.config.mjs"),
    "utf8",
  );
  const header = await readFile(
    path.join(blogRoot, "src", "components", "MyHeader.astro"),
    "utf8",
  );

  assert.match(config, /title:\s*"MotionPress Journal"/);
  assert.doesNotMatch(config, /YOUR-GOOGLE-ANALYTICS-ID|Your SaaS/);
  assert.doesNotMatch(config, /ThemeSelect\s*:/);
  assert.match(header, /PUBLIC_APP_URL/);
  assert.match(header, /Workspace/);
  assert.doesNotMatch(header, /open-saas\.locale/);
});
