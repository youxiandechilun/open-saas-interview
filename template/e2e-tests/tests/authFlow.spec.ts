import { expect, test } from "@playwright/test";
import { createRandomUser } from "./utils";

const appUrl = "http://localhost:3000";

test("development signup auto-logs in and the account remains usable", async ({
  browser,
}) => {
  const user = createRandomUser();
  const signupContext = await browser.newContext();

  try {
    const signupPage = await signupContext.newPage();
    await signupPage.goto(`${appUrl}/signup`, {
      waitUntil: "domcontentloaded",
    });
    await signupPage.fill('input[name="email"]', user.email);
    await signupPage.fill('input[name="password"]', user.password!);
    await signupPage.fill('input[name="confirmPassword"]', user.password!);

    const [signupResponse] = await Promise.all([
      signupPage.waitForResponse(
        (response) => new URL(response.url()).pathname === "/auth/email/signup",
      ),
      signupPage.getByRole("button", { name: "Sign up", exact: true }).click(),
    ]);

    expect(signupResponse.status()).toBe(200);
    await expect(signupPage).toHaveURL(`${appUrl}/ai-studio`);
  } finally {
    await signupContext.close();
  }

  const loginContext = await browser.newContext();

  try {
    const loginPage = await loginContext.newPage();
    await loginPage.goto(`${appUrl}/login`, {
      waitUntil: "domcontentloaded",
    });
    await loginPage.fill('input[name="email"]', user.email);
    await loginPage.fill('input[name="password"]', user.password!);

    const [loginResponse] = await Promise.all([
      loginPage.waitForResponse(
        (response) => new URL(response.url()).pathname === "/auth/email/login",
      ),
      loginPage.getByRole("button", { name: "Log in", exact: true }).click(),
    ]);

    expect(loginResponse.status()).toBe(200);
    await expect(loginPage).toHaveURL(`${appUrl}/ai-studio`);
  } finally {
    await loginContext.close();
  }
});

test("browser language is applied and a manual choice persists", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "zh-CN" });

  try {
    const page = await context.newPage();
    await page.goto(`${appUrl}/login`, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "登录" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await page.getByRole("button", { name: "英文" }).click();
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem("motionpress.locale")),
      )
      .toBe("en");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("login errors follow the selected language", async ({ browser }) => {
  const context = await browser.newContext({ locale: "zh-CN" });

  try {
    const page = await context.newPage();
    await page.goto(`${appUrl}/login`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "登录" })).toBeVisible();

    await page.fill('input[name="email"]', `missing-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', "not-a-valid-password");
    await page.getByRole("button", { name: "登录", exact: true }).click();

    await expect(page.getByRole("alert")).toHaveText("邮箱或密码不正确。");
  } finally {
    await context.close();
  }
});

test("account recovery pages keep the localized auth shell", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "zh-CN" });
  const pages = [
    { path: "/request-password-reset", heading: "重置密码" },
    { path: "/password-reset", heading: "设置新密码" },
    { path: "/email-verification", heading: "验证邮箱" },
  ];

  try {
    const page = await context.newPage();
    for (const authPage of pages) {
      await page.goto(`${appUrl}${authPage.path}`, {
        waitUntil: "domcontentloaded",
      });
      await expect(
        page.getByRole("heading", { level: 1, name: authPage.heading }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "返回登录", exact: true }),
      ).toHaveAttribute("href", "/login");
    }
  } finally {
    await context.close();
  }
});
