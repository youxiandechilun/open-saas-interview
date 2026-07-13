import { expect, test, type Page } from "@playwright/test";
import { createRandomUser, logUserIn, signUserUp } from "./utils";

test.describe("technical SEO", () => {
  test("landing and pricing publish route-specific metadata", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://your-saas-app.com/",
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      "content",
      "website",
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );

    await page.goto("/pricing");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://your-saas-app.com/pricing",
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      "content",
      "product",
    );
    await expect(
      page.locator('script[type="application/ld+json"]'),
    ).toContainText('"@type":"OfferCatalog"');
  });

  test("public CMS feed is available without a session", async ({
    request,
  }) => {
    const response = await request.get("/content-cms/published");
    expect(response.ok()).toBeTruthy();
    const feed = await response.json();
    expect(feed).toEqual(
      expect.objectContaining({
        contentVersion: expect.any(String),
        updatedAt: expect.any(String),
        posts: expect.any(Array),
      }),
    );
  });
});

test.describe("authenticated feature routes", () => {
  test.describe.configure({ mode: "serial" });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    const user = createRandomUser();
    await signUserUp({ page, user });
    await logUserIn({ page, user });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("AI Studio is private and exposes its core workflow", async () => {
    await page.goto("/ai-studio");
    await expect(
      page.getByRole("heading", { name: "AI Animation Studio" }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow, noarchive",
    );
    await expect(page.getByLabel("Animation prompt")).toBeVisible();
    await expect(page.getByRole("button", { name: "Optimize" })).toBeDisabled();
  });

  test("non-admin users cannot open the CMS console", async () => {
    await page.goto("/admin/content");
    await page.waitForURL("**/");
    await expect(page).toHaveURL(/\/$/);
  });
});
