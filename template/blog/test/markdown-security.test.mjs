import assert from "node:assert/strict";
import test from "node:test";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import { motionpressMarkdownRehypePlugins } from "../src/lib/markdownSecurity.mjs";

async function render(markdown) {
  const processor = await createMarkdownProcessor({
    syntaxHighlight: false,
    rehypePlugins: motionpressMarkdownRehypePlugins,
  });
  return (await processor.render(markdown)).code;
}

test("the Astro Markdown boundary removes executable CMS HTML", async () => {
  const html = await render(`## Safe heading

<script>document.body.dataset.xss = "yes"</script>
<img src="/preview.png" alt="Preview" onerror="alert(1)">
<a href="javascript:alert(1)">Unsafe link</a>
<iframe src="https://evil.example"></iframe>`);

  assert.doesNotMatch(
    html,
    /<script|onerror|javascript:|document\.body|<iframe/i,
  );
  assert.match(html, /<h2 id="safe-heading">Safe heading<\/h2>/);
  assert.match(html, /<img src="\/preview\.png" alt="Preview">/);
  assert.match(html, />Unsafe link<\/a>/);
});

test("the allowlist preserves MotionPress public video markup", async () => {
  const html =
    await render(`<figure data-motionpress-animation-id="f7b8e395-8658-4f1d-8f74-f38ca971c536">
  <video controls preload="metadata" playsinline aria-label="Launch preview">
    <source src="https://api.example.test/content-cms/media/f7b8e395-8658-4f1d-8f74-f38ca971c536" type="video/mp4">
  </video>
  <figcaption>Launch preview</figcaption>
</figure>`);

  assert.match(html, /<figure data-motionpress-animation-id=/);
  assert.match(html, /<video controls preload="metadata" playsinline/);
  assert.match(html, /aria-label="Launch preview"/);
  assert.match(
    html,
    /<source src="https:\/\/api\.example\.test\/content-cms\/media\//,
  );
  assert.match(html, /type="video\/mp4">/);
});
