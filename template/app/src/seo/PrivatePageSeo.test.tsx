import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrivatePageSeo } from "./PrivatePageSeo";

describe("PrivatePageSeo", () => {
  it("marks authenticated and utility routes as noindex", () => {
    const markup = renderToStaticMarkup(
      <PrivatePageSeo pathname="/admin/content" />,
    );

    expect(markup).toContain(
      '<link rel="canonical" href="https://your-saas-app.com/admin/content"/>',
    );
    expect(markup).toContain(
      '<meta name="robots" content="noindex, nofollow, noarchive"/>',
    );
  });
});
