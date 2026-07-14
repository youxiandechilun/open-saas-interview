import { expect, test, type Page } from "@playwright/test";
import { createRandomUser, signUserUp } from "./utils";

test.describe("technical SEO", () => {
  test("landing publishes social metadata and auth pages stay private", async ({
    page,
  }) => {
    await page.goto("/");
    const siteOrigin = new URL(page.url()).origin;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${siteOrigin}/`,
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      "content",
      "website",
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );

    await page.goto("/login");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${siteOrigin}/login`,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow, noarchive",
    );
  });

  test("public CMS feed is available without a session", async ({
    request,
  }) => {
    const serverOrigin = process.env.WASP_SERVER_URL ?? "http://localhost:3001";
    const response = await request.get(`${serverOrigin}/content-cms/published`);
    expect(response.ok()).toBeTruthy();
    const feed = await response.json();
    expect(feed).toEqual(
      expect.objectContaining({
        contentVersion: expect.any(String),
        posts: expect.any(Array),
      }),
    );
    expect(feed.updatedAt === null || typeof feed.updatedAt === "string").toBe(
      true,
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

    await page.getByRole("button", { name: "Chinese" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(
      page.getByRole("heading", { name: "AI 动画工作室" }),
    ).toBeVisible();
    await expect(page.getByLabel("动画描述")).toBeVisible();
  });

  test("non-admin users cannot open the CMS console", async () => {
    await page.goto("/admin/content");
    await page.waitForURL("**/admin");
    await expect(page).toHaveURL(/\/admin$/);
  });
});
