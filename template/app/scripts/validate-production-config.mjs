import { pathToFileURL } from "node:url";
import { validateProductionConfig } from "../src/seo/productionConfig.mjs";

export { validateProductionConfig } from "../src/seo/productionConfig.mjs";

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const config = validateProductionConfig(process.env);
    console.log(`Production URLs verified for ${config.siteUrl}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
