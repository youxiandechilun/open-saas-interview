import { describe, expect, it } from "vitest";
import {
  getCanonicalUrl,
  getSocialImageUrl,
  normalizeSiteOrigin,
} from "./site";

describe("site SEO URLs", () => {
  it("normalizes canonical paths without changing the origin", () => {
    expect(getCanonicalUrl("/")).toBe("http://localhost:3000/");
    expect(getCanonicalUrl("//pricing//")).toBe(
      "http://localhost:3000/pricing",
    );
  });

  it("returns an absolute social image URL", () => {
    expect(getSocialImageUrl()).toBe(
      "http://localhost:3000/motionpress-social.png",
    );
  });

  it("normalizes configured origins and rejects unsafe protocols", () => {
    expect(normalizeSiteOrigin("https://example.com/path/")).toBe(
      "https://example.com",
    );
    expect(() => normalizeSiteOrigin("javascript:alert(1)")).toThrow(
      "must use http or https",
    );
  });
});
