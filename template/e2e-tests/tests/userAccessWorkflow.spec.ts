import { expect, test } from "@playwright/test";
import { createRandomUser, logUserIn, signUserUp } from "./utils";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "me@example.com";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "password123";

test("an administrator can assign a role and suspend workspace access", async ({
  browser,
}) => {
  const managedUser = createRandomUser();
  const signupContext = await browser.newContext();
  try {
    await signUserUp({
      page: await signupContext.newPage(),
      user: managedUser,
    });
  } finally {
    await signupContext.close();
  }

  const adminContext = await browser.newContext();
  try {
    const page = await adminContext.newPage();
    await logUserIn({
      page,
      user: { email: adminEmail, password: adminPassword },
    });
    await page.goto("/admin/users");
    await page.getByLabel("Search").fill(managedUser.email);

    const row = page.getByRole("row").filter({ hasText: managedUser.email });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Edit" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.locator('[id^="role-"]').click();
    await page.getByRole("option", { name: "Editor", exact: true }).click();
    await dialog.getByRole("switch").click();
    await dialog.getByRole("button", { name: "Confirm changes" }).click();

    await expect(row).toContainText("Editor");
    await expect(row).toContainText("Disabled");
  } finally {
    await adminContext.close();
  }

  const disabledContext = await browser.newContext();
  try {
    const page = await disabledContext.newPage();
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill('input[name="email"]', managedUser.email);
    await page.fill(
      'input[name="password"]',
      managedUser.password ?? "password123",
    );
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Account access suspended" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();
  } finally {
    await disabledContext.close();
  }
});
