import { expect, type Page } from "@playwright/test";
import { randomUUID } from "crypto";

export type User = {
  id?: number;
  email: string;
  password?: string;
};

const DEFAULT_PASSWORD = "password123";

export const logUserIn = async ({ page, user }: { page: Page; user: User }) => {
  if (new URL(page.url()).pathname === "/ai-studio") return;

  await page.goto("/login", { waitUntil: "domcontentloaded" });

  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password ?? DEFAULT_PASSWORD);

  const [loginResponse] = await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/auth/email/login",
    ),
    page.getByRole("button", { name: "Log in", exact: true }).click(),
  ]);

  expect(loginResponse.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/ai-studio$/);
};

export const signUserUp = async ({
  page,
  user,
}: {
  page: Page;
  user: User;
}) => {
  await page.goto("/signup", { waitUntil: "domcontentloaded" });

  const password = user.password ?? DEFAULT_PASSWORD;

  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="confirmPassword"]', password);

  const [signupResponse] = await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/auth/email/signup",
    ),
    page.getByRole("button", { name: "Sign up", exact: true }).click(),
  ]);

  expect(signupResponse.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/ai-studio$/);
};

export const createRandomUser = () => {
  const email = `${randomUUID()}@test.com`;
  return { email, password: DEFAULT_PASSWORD } as User;
};
