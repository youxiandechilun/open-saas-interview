import { copyFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const blogRoot = fileURLToPath(new URL("../", import.meta.url));
const source = path.resolve(
  blogRoot,
  "../app/public/motionpress-social.png",
);
const faviconSource = path.resolve(blogRoot, "../app/public/favicon.png");
const target = path.join(
  blogRoot,
  "public/banner-images/default-banner.webp",
);
const temporary = `${target}.${process.pid}.tmp`;

try {
  await sharp(source)
    .resize(1200, 630, { fit: "cover" })
    .webp({ quality: 88 })
    .toFile(temporary);
  await rm(target, { force: true });
  await rename(temporary, target);
  await copyFile(faviconSource, path.join(blogRoot, "public/favicon.png"));
} catch (error) {
  await rm(temporary, { force: true });
  throw error;
}

console.log("MotionPress social image synced to the blog banner.");
