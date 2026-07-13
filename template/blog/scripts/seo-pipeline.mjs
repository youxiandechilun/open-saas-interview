import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { SITE_URL } from "../src/lib/site.mjs";
import {
  buildSeoManifest,
  checkPostQuality,
  parseMarkdownDocument,
} from "./seo-quality.mjs";

const PROJECT_ROOT = fileURLToPath(new globalThis.URL("../", import.meta.url));
const DOCS_ROOT = path.join(PROJECT_ROOT, "src", "content", "docs");
const MANIFEST_PATH = path.join(
  PROJECT_ROOT,
  "public",
  "blog-seo-manifest.json",
);

/** @param {string} directory */
async function markdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await markdownFiles(candidate)));
    if (entry.isFile() && /\.mdx?$/i.test(entry.name)) files.push(candidate);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

/** @param {string} file */
async function loadDocument(file) {
  const relative = path.relative(DOCS_ROOT, file).replaceAll("\\", "/");
  return parseMarkdownDocument(await readFile(file, "utf8"), relative);
}

/** @param {string} target @param {string} content */
async function atomicWrite(target, content) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  const backup = `${target}.${process.pid}.bak`;
  await writeFile(temporary, content, "utf8");
  let hadTarget = false;
  try {
    try {
      await rename(target, backup);
      hadTarget = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true });
    if (hadTarget) await rename(backup, target);
    throw error;
  }
  if (hadTarget) await rm(backup, { force: true });
}

/** @param {{write?: boolean}} [options] */
export async function runSeoPipeline(options = {}) {
  const allDocuments = await Promise.all(
    (await markdownFiles(DOCS_ROOT)).map(loadDocument),
  );
  const blogDocuments = allDocuments.filter((document) =>
    document.file.startsWith("blog/"),
  );
  const knownRoutes = new Set([
    "/blog/",
    ...allDocuments.map((document) => document.route),
  ]);
  const reports = blogDocuments
    .filter((document) => document.frontmatter.draft !== true)
    .map((document) =>
      checkPostQuality(document, {
        knownRoutes,
        frameworkCanonical: true,
        frameworkH1: true,
      }),
    );
  const qualityErrors = reports.flatMap((report) =>
    report.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => ({ ...issue, file: report.file })),
  );
  const routeOwners = new Map();
  const duplicateRouteErrors = [];
  for (const document of blogDocuments.filter(
    (entry) => entry.frontmatter.draft !== true,
  )) {
    const existingFile = routeOwners.get(document.route);
    if (existingFile) {
      duplicateRouteErrors.push({
        file: document.file,
        rule: "canonical-route",
        severity: "error",
        message: `Route '${document.route}' is also produced by '${existingFile}'.`,
        suggestion: "Give each published post a unique slug before rebuilding.",
      });
    } else {
      routeOwners.set(document.route, document.file);
    }
  }
  const errors = [...qualityErrors, ...duplicateRouteErrors];
  const warnings = reports.flatMap((report) =>
    report.issues
      .filter((issue) => issue.severity === "warning")
      .map((issue) => ({ ...issue, file: report.file })),
  );
  const manifest = buildSeoManifest(blogDocuments, { siteUrl: SITE_URL });

  if (options.write && errors.length === 0) {
    await atomicWrite(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  return { reports, errors, warnings, manifest, manifestPath: MANIFEST_PATH };
}

function printFindings(result) {
  for (const finding of [...result.errors, ...result.warnings]) {
    console.log(
      `${finding.severity.toUpperCase()} ${finding.file} [${finding.rule}] ${finding.message}`,
    );
    console.log(`  Suggestion: ${finding.suggestion}`);
  }
  console.log(
    `SEO pipeline: ${result.reports.length} published post(s), ${result.errors.length} error(s), ${result.warnings.length} warning(s).`,
  );
}

async function runCli() {
  const result = await runSeoPipeline({
    write: process.argv.includes("--write"),
  });
  printFindings(result);
  if (result.errors.length > 0) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runCli().catch((error) => {
    console.error(`SEO pipeline failed: ${error.message}`);
    process.exitCode = 1;
  });
}
