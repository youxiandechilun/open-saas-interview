import { expect, test, type Page } from "@playwright/test";
import { createRandomUser, logUserIn, signUserUp, type User } from "./utils";

let page: Page;
let testUser: User;

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  testUser = createRandomUser();
  await signUserUp({ page, user: testUser });
  await logUserIn({ page, user: testUser });
});

test.afterAll(async () => {
  await page.close();
});

test.describe("auth redirect tests", () => {
  test("logged-in user visiting /login should redirect to /ai-studio", async () => {
    // User is already logged in from beforeAll
    await page.goto("/login");

    await page.waitForURL("**/ai-studio", { timeout: 5000 });
    expect(page.url()).toContain("/ai-studio");
  });

  test("logged-in user visiting /signup should redirect to /ai-studio", async () => {
    // User is already logged in from beforeAll
    await page.goto("/signup");

    await page.waitForURL("**/ai-studio", { timeout: 5000 });
    expect(page.url()).toContain("/ai-studio");
  });
});
