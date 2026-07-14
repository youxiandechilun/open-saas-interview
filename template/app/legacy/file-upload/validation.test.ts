import { describe, expect, it } from "vitest";
import { isOwnedS3Key } from "./validation";

describe("isOwnedS3Key", () => {
  it("accepts only a direct object under the authenticated user prefix", () => {
    expect(isOwnedS3Key("user-1/asset.webp", "user-1")).toBe(true);
    expect(isOwnedS3Key("user-2/asset.webp", "user-1")).toBe(false);
    expect(isOwnedS3Key("user-1/folder/asset.webp", "user-1")).toBe(false);
    expect(isOwnedS3Key("user-1/../asset.webp", "user-1")).toBe(false);
    expect(isOwnedS3Key("user-1\\asset.webp", "user-1")).toBe(false);
  });
});
