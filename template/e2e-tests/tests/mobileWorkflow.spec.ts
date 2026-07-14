import { expect, test } from "@playwright/test";
import { logUserIn } from "./utils";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "me@example.com";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "password123";

test("the mobile workspace keeps the core publishing path reachable", async ({
  page,
}) => {
  await logUserIn({
    page,
    user: { email: adminEmail, password: adminPassword },
  });

  await expect(page).toHaveURL(/\/ai-studio$/);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("link", { name: "Animation Studio", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Articles & Publishing", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/content$/);
  await expect(
    page.getByRole("heading", { name: "Content CMS" }),
  ).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
});
