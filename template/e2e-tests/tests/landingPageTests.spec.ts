import { expect, test } from "@playwright/test";

test.describe("general landing page tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has title", async ({ page }) => {
    await expect(page).toHaveTitle(/MotionPress/);
  });

  test("workspace call to action", async ({ page }) => {
    await page.getByRole("link", { name: "Create a workspace" }).click();
    await page.waitForURL("**/signup");
  });

  test("shows the real product workflow", async ({ page }) => {
    await expect(
      page.getByRole("heading", { level: 1, name: "MotionPress" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "The core path is visible from start to finish",
      }),
    ).toBeVisible();
  });
});

test.describe("cookie consent tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("cookie consent banner rejection does not set cc_cookie", async ({
    context,
    page,
  }) => {
    await page.$$('button:has-text("Reject all")');
    await page.click('button:has-text("Reject all")');

    const cookies = await context.cookies();
    const consentCookie = cookies.find((c) => c.name === "cc_cookie");
    const cookieObject = JSON.parse(decodeURIComponent(consentCookie.value));
    expect(cookieObject.categories.includes("analytics")).toBeFalsy();
  });

  test("cookie consent acceptance records the analytics choice", async ({
    context,
    page,
  }) => {
    await page.$$('button:has-text("Accept all")');
    await page.click('button:has-text("Accept all")');

    const cookies = await context.cookies();
    const consentCookie = cookies.find((c) => c.name === "cc_cookie");
    const cookieObject = JSON.parse(decodeURIComponent(consentCookie.value));
    expect(cookieObject.categories.includes("analytics")).toBeTruthy();
  });
});
