import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  resolve: {
    alias: {
      "wasp/server": fileURLToPath(
        new URL("./testWaspServer.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    exclude: ["**/.wasp/**", "**/node_modules/**"],
  },
});
