import { describe, expect, it } from "vitest";
import { authEnvSchema } from "./env";

describe("administrator bootstrap configuration", () => {
  it("normalizes and filters the configured administrator emails", () => {
    expect(
      authEnvSchema.parse({
        ADMIN_EMAILS: " Admin@MotionPress.example, ,editor@example.com ",
      }).ADMIN_EMAILS,
    ).toEqual(["admin@motionpress.example", "editor@example.com"]);
  });
});
