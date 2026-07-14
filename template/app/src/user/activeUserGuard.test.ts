import { describe, expect, it } from "vitest";
import { requireActiveUser } from "../server/activeUserGuard";

describe("active user guard", () => {
  it("rejects anonymous and disabled callers", () => {
    expect(() => requireActiveUser(undefined)).toThrow(/Authentication/);
    expect(() =>
      requireActiveUser({ id: "disabled", isDisabled: true }),
    ).toThrow(/disabled/);
  });

  it("returns an active authenticated caller", () => {
    const user = { id: "active", isDisabled: false, email: "a@example.com" };
    expect(requireActiveUser(user)).toBe(user);
  });
});
