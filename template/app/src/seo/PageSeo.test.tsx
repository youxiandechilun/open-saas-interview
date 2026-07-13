import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageSeo } from "./PageSeo";

describe("PageSeo", () => {
  it("renders canonical, social, robots, and safe structured metadata", () => {
    const markup = renderToStaticMarkup(
      <PageSeo
        title="Pricing"
        description="Compare product plans."
        pathname="/pricing"
        type="product"
        structuredData={{
          "@context": "https://schema.org",
          name: "</script><img src=x onerror=alert(1)>",
        }}
      />,
    );

    expect(markup).toContain(
      '<link rel="canonical" href="https://your-saas-app.com/pricing"/>',
    );
    expect(markup).toContain('<meta name="robots" content="index, follow"/>');
    expect(markup).toContain('<meta property="og:type" content="product"/>');
    expect(markup).toContain("\\u003c/script>\\u003cimg");
    expect(markup).not.toContain("</script><img");
  });
});
