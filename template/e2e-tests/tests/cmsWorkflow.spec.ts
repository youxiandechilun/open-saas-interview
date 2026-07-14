import { expect, test } from "@playwright/test";
import { logUserIn } from "./utils";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "me@example.com";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "password123";

test("an editor can manage taxonomy and a quality-gated draft", async ({
  page,
  request,
}) => {
  const suffix = Date.now().toString(36);
  const authorName = `E2E Author ${suffix}`;
  const tagName = `E2E Tag ${suffix}`;
  const title = `Reliable animation workflow ${suffix}`;
  const slug = `reliable-animation-workflow-${suffix}`;

  await logUserIn({
    page,
    user: { email: adminEmail, password: adminPassword },
  });
  await page.goto("/admin/content");

  await page.getByRole("button", { name: "Authors", exact: true }).click();
  await page.getByRole("button", { name: "Add author" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(authorName);
  await dialog
    .getByLabel("Bio")
    .fill("Editorial owner for browser workflow tests.");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(authorName, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Tags", exact: true }).click();
  await page.getByRole("button", { name: "Add tag" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(tagName);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(tagName, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Posts", exact: true }).click();
  await page.getByRole("button", { name: "New post" }).click();
  await page.getByLabel("Title").fill(title);
  await page.locator("#cms-author").click();
  await page.getByRole("option", { name: authorName }).click();
  await page.getByLabel(tagName).click();
  await page
    .getByLabel("Search excerpt")
    .fill(
      "A practical browser-tested workflow for producing reliable animation assets and search-ready editorial content.",
    );

  const publish = page.getByRole("button", { name: "Publish", exact: true });
  await expect(publish).toBeDisabled();
  await page
    .getByLabel("Article body (Markdown or HTML)")
    .fill(
      `## Operational workflow\n\nRead the [publishing guide](/guides/publishing-workflow/) before release.\n\n${"This section records ownership, review state, rendering status, and a repeatable recovery path for the content team. ".repeat(3)}`,
    );
  await expect(publish).toBeEnabled();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  const serverOrigin = process.env.WASP_SERVER_URL ?? "http://localhost:3001";
  const feedResponse = await request.get(
    `${serverOrigin}/content-cms/published`,
  );
  expect(feedResponse.ok()).toBeTruthy();
  const feed = await feedResponse.json();
  expect(feed.posts.some((post: { slug: string }) => post.slug === slug)).toBe(
    false,
  );

  const postRow = page.locator("article").filter({ hasText: title });
  page.once("dialog", (confirmation) => confirmation.accept());
  await postRow.getByTitle("Delete post").click();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);

  await deleteTaxonomyItem(page, "Tags", tagName, "Delete tag");
  await deleteTaxonomyItem(page, "Authors", authorName, "Delete author");
});

async function deleteTaxonomyItem(
  page: import("@playwright/test").Page,
  tab: "Authors" | "Tags",
  name: string,
  action: "Delete author" | "Delete tag",
) {
  await page.getByRole("button", { name: tab, exact: true }).click();
  const row = page
    .getByText(name, { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'grid')][1]");
  page.once("dialog", (confirmation) => confirmation.accept());
  await row.getByTitle(action).click();
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
}
