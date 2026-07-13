import { describe, expect, it } from "vitest";
import { getCanonicalUrl, getSocialImageUrl } from "./site";

describe("site SEO URLs", () => {
  it("normalizes canonical paths without changing the origin", () => {
    expect(getCanonicalUrl("/")).toBe("https://your-saas-app.com/");
    expect(getCanonicalUrl("//pricing//")).toBe(
      "https://your-saas-app.com/pricing",
    );
  });

  it("returns an absolute social image URL", () => {
    expect(getSocialImageUrl()).toBe(
      "https://your-saas-app.com/public-banner.webp",
    );
  });
});
