const PREVIEW_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "media-src data: blob:",
  "font-src data:",
  "connect-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "navigate-to 'none'",
].join("; ");

const BLOCKED_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  [/<\s*(?:iframe|frame|object|embed|link|base|form|a)\b/i, "blocked element"],
  [/<\s*meta\b[^>]*http-equiv\s*=\s*["']?refresh/i, "meta refresh"],
  [/<\s*script\b[^>]*\bsrc\s*=/i, "external script"],
  [
    /\b(?:href|action|formaction|srcset|poster)\s*=/i,
    "navigation or resource attribute",
  ],
  [
    /\bsrc\s*=\s*(?:["'](?!data:|blob:)|(?!(?:["']|data:|blob:)))/i,
    "non-embedded resource",
  ],
  [
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(/i,
    "network API",
  ],
  [/\bnavigator\s*\.\s*sendBeacon\b/i, "network API"],
  [/\b(?:window\s*\.\s*)?open\s*\(/i, "window navigation"],
  [
    /\b(?:window\s*\.\s*|document\s*\.\s*|top\s*\.\s*|parent\s*\.\s*)?location\s*(?:=|\.|\[)/i,
    "location navigation",
  ],
  [/\b(?:Worker|SharedWorker)\s*\(/i, "worker"],
  [/\bimport\s*\(/i, "dynamic import"],
  [/\beval\s*\(|\bnew\s+Function\s*\(/i, "dynamic code evaluation"],
  [
    /@import\b|url\s*\(\s*(?:["'](?!data:|blob:)|(?!(?:["']|data:|blob:)))/i,
    "external CSS resource",
  ],
];

export type HtmlValidationResult = { ok: true } | { ok: false; reason: string };

export function validateAnimationHtml(html: string): HtmlValidationResult {
  if (html.length < 80) {
    return { ok: false, reason: "Animation HTML is too short" };
  }
  if (html.length > 100_000) {
    return { ok: false, reason: "Animation HTML exceeds 100 KB" };
  }

  for (const [pattern, reason] of BLOCKED_PATTERNS) {
    if (pattern.test(html)) {
      return { ok: false, reason: `Animation HTML contains ${reason}` };
    }
  }

  return { ok: true };
}

export function buildSandboxSrcDoc(html: string): string {
  const validation = validateAnimationHtml(html);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  const withoutDoctype = html.replace(/<!doctype[^>]*>/gi, "").trim();
  const csp = `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">`;
  const referrer = '<meta name="referrer" content="no-referrer">';
  const headMatch = withoutDoctype.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i);
  const bodyMatch = withoutDoctype.match(
    /<body\b([^>]*)>([\s\S]*?)<\/body\s*>/i,
  );
  const htmlMatch = withoutDoctype.match(/<html\b([^>]*)>/i);
  const outsideDocument = withoutDoctype
    .replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/gi, "")
    .replace(/<body\b[^>]*>[\s\S]*?<\/body\s*>/gi, "")
    .replace(/<\/?html\b[^>]*>/gi, "")
    .trim();
  const headContent = headMatch?.[1] ?? "";
  const bodyContent = `${bodyMatch?.[2] ?? ""}${outsideDocument}`;
  const htmlAttributes = htmlMatch?.[1] ?? "";
  const bodyAttributes = bodyMatch?.[1] ?? "";

  return `<!doctype html><html${htmlAttributes}><head>${csp}${referrer}${headContent}</head><body${bodyAttributes}>${bodyContent}</body></html>`;
}

export const AI_PREVIEW_IFRAME_SANDBOX = "allow-scripts";
