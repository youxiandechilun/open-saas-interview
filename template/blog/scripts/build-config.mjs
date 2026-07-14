import { validateProductionBuildConfig } from "./production-config.mjs";

try {
  const config = validateProductionBuildConfig(process.env);
  console.log(
    config.offline
      ? `Production build config verified for ${config.siteUrl} (explicit offline CMS snapshot).`
      : `Production build config verified for ${config.siteUrl}.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
