import { describe, expect, it } from "vitest";
import { sanitizeCmsMarkdown } from "./contentSecurity";

describe("CMS Markdown security", () => {
  it("preserves ordinary Markdown while removing executable raw HTML", () => {
    const markdown =
      "## Safe section\n\nRead the [publishing guide](/guides/publishing-workflow/).";
    expect(sanitizeCmsMarkdown(markdown)).toBe(markdown);

    const sanitized = sanitizeCmsMarkdown(
      '<script>document.body.dataset.xss="yes"</script><img src="/image.png" alt="Preview" onerror="alert(1)">',
    );
    expect(sanitized).not.toMatch(/script|onerror|dataset\.xss/i);
    expect(sanitized).toContain('src="/image.png"');
    expect(sanitized).toContain('alt="Preview"');
  });

  it("removes active URL schemes and unsafe document containers", () => {
    const sanitized = sanitizeCmsMarkdown(
      '<a href="javascript:alert(1)">Click</a><iframe src="https://evil.example"></iframe><form action="https://evil.example"><input></form>',
    );
    expect(sanitized).not.toMatch(
      /javascript:|iframe|form|input|evil\.example/i,
    );
    expect(sanitized).toContain("Click");
  });

  it("keeps the restricted public video markup used by MotionPress", () => {
    const sanitized = sanitizeCmsMarkdown(
      '<figure data-motionpress-animation-id="asset-1"><video controls preload="metadata" playsinline><source src="https://api.example.test/video.mp4" type="video/mp4"></video><figcaption>Preview</figcaption></figure>',
    );
    expect(sanitized).toMatch(
      /<figure data-motionpress-animation-id="asset-1">/,
    );
    expect(sanitized).toMatch(
      /<video controls preload="metadata" playsinline>/,
    );
    expect(sanitized).toMatch(/type="video\/mp4"/);
  });
});
