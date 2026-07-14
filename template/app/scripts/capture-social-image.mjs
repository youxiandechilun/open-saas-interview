import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(pathToFileURL(path.join(root, "scripts", "social-image.html")).href);
  await page.screenshot({
    path: path.join(root, "public", "motionpress-social.png"),
    type: "png",
  });
  await page.locator(".mark").screenshot({
    path: path.join(root, "public", "favicon.png"),
    type: "png",
  });
} finally {
  await browser.close();
}
