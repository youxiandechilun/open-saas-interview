import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "me@example.com";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "password123";

test("an administrator can discover the bilingual AI and CMS tools", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "zh-CN" });

  try {
    const page = await context.newPage();
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "登录" })).toBeVisible();

    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.getByRole("button", { name: "登录", exact: true }).click();

    await expect(page).toHaveURL(/\/ai-studio$/);
    await expect(
      page.getByRole("heading", { name: "AI 动画工作室" }),
    ).toBeVisible();

    await page
      .getByLabel("工作台")
      .getByRole("link", { name: "AI 服务配置", exact: true })
      .click();
    await expect(page).toHaveURL(/\/admin\/ai-provider$/);
    await expect(
      page.getByRole("heading", { name: "AI 服务配置" }),
    ).toBeVisible();
    await expect(page.getByLabel("接口地址（Base URL）")).not.toHaveValue("");
    await expect(page.getByLabel("模型名称")).not.toHaveValue("");
    await expect(page.getByText(/API 密钥:/)).toBeVisible();

    await page
      .getByRole("link", { name: "动画工作室", exact: true })
      .first()
      .click();
    await page
      .getByRole("link", { name: "文章与发布", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/admin\/content$/);
    await expect(page.getByRole("heading", { name: "内容管理" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "文章", exact: true }),
    ).toBeVisible();

    const publicSiteLink = page.getByRole("link", {
      name: "查看公开站点",
    });
    await expect(publicSiteLink).toHaveAttribute(
      "href",
      "http://localhost:4321/blog/",
    );

    await page.getByRole("button", { name: "英文" }).click();
    await expect(
      page.getByRole("heading", { name: "Content CMS" }),
    ).toBeVisible();

    const blogPage = await context.newPage();
    await blogPage.goto("http://localhost:4321/blog/");
    await expect(
      blogPage.getByRole("link", { name: /^(工作台|Workspace)$/ }).first(),
    ).toHaveAttribute("href", "http://localhost:3000/");
  } finally {
    await context.close();
  }
});
