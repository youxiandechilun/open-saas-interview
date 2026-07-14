import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrivatePageSeo } from "./PrivatePageSeo";

describe("PrivatePageSeo", () => {
  it("marks authenticated and utility routes as noindex", () => {
    const markup = renderToStaticMarkup(
      <PrivatePageSeo pathname="/admin/content" />,
    );

    expect(markup).toContain(
      '<link rel="canonical" href="http://localhost:3000/admin/content"/>',
    );
    expect(markup).toContain(
      '<meta name="robots" content="noindex, nofollow, noarchive"/>',
    );
  });
});
