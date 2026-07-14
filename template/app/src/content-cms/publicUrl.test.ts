import { describe, expect, it } from "vitest";
import { getCmsPublicUrl } from "./publicUrl";

describe("CMS public URLs", () => {
  it("builds an absolute canonical URL from the configured blog origin", () => {
    expect(
      getCmsPublicUrl(
        "https://motionpress.example/blog/",
        "animation-workflow",
      ),
    ).toBe("https://motionpress.example/blog/animation-workflow/");
  });

  it("falls back to the local blog path", () => {
    expect(getCmsPublicUrl(undefined, "animation-workflow")).toBe(
      "/blog/animation-workflow/",
    );
  });
});
