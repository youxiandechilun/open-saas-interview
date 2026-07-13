import { describe, expect, it } from "vitest";
import {
  AI_PREVIEW_IFRAME_SANDBOX,
  buildSandboxSrcDoc,
  validateAnimationHtml,
} from "./security";

const safeHtml = `
  <html><head><style>body { margin: 0 } .dot { animation: move 2s infinite }</style></head>
  <body><div class="dot">Hello</div><script>document.querySelector('.dot').animate([{opacity:0},{opacity:1}], 1000)</script></body></html>
`;

describe("animation HTML security", () => {
  it("allows self-contained inline animation code", () => {
    expect(validateAnimationHtml(safeHtml)).toEqual({ ok: true });
  });

  it.each([
    '<script src="https://example.com/a.js"></script>',
    '<img src="https://example.com/pixel.png">',
    '<img src="/private/pixel.png">',
    '<a href="/account">open</a>',
    '<video poster="/private/frame.png"></video>',
    "<script>fetch('/secrets')</script>",
    "<script>window.location = 'https://example.com'</script>",
    '<meta http-equiv="refresh" content="0;url=https://example.com">',
    '<form action="/steal"><button>go</button></form>',
  ])("rejects unsafe markup: %s", (candidate) => {
    const padded = `<div>${"safe".repeat(30)}</div>${candidate}`;
    expect(validateAnimationHtml(padded).ok).toBe(false);
  });

  it("injects CSP before generated head content", () => {
    const srcDoc = buildSandboxSrcDoc(safeHtml);
    expect(srcDoc.indexOf("Content-Security-Policy")).toBeLessThan(
      srcDoc.indexOf("<style>"),
    );
    expect(srcDoc).toContain("connect-src 'none'");
    expect(srcDoc).toContain("navigate-to 'none'");
  });

  it("moves markup outside the document behind the CSP", () => {
    const prefixed = `<script>const image = new Image(); image['src'] = 'https://example.com/pixel'</script>${safeHtml}`;
    const srcDoc = buildSandboxSrcDoc(prefixed);
    expect(srcDoc.indexOf("Content-Security-Policy")).toBeLessThan(
      srcDoc.indexOf("const image"),
    );
  });

  it("allows embedded data resources", () => {
    const html = `<div>${"safe".repeat(
      30,
    )}</div><img alt="dot" src="data:image/png;base64,iVBORw0KGgo=">`;
    expect(validateAnimationHtml(html)).toEqual({ ok: true });
  });

  it("uses scripts-only iframe sandboxing", () => {
    expect(AI_PREVIEW_IFRAME_SANDBOX).toBe("allow-scripts");
    expect(AI_PREVIEW_IFRAME_SANDBOX).not.toContain("allow-same-origin");
    expect(AI_PREVIEW_IFRAME_SANDBOX).not.toContain("allow-top-navigation");
  });
});
