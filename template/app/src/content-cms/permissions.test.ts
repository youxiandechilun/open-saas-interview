import { describe, expect, it } from "vitest";
import { canManageCms } from "./permissions";

describe("CMS permissions", () => {
  it.each(["ADMIN", "EDITOR"] as const)("allows active %s users", (role) => {
    expect(canManageCms({ role, isAdmin: false, isDisabled: false })).toBe(
      true,
    );
  });

  it("keeps legacy administrators compatible", () => {
    expect(
      canManageCms({ role: "CREATOR", isAdmin: true, isDisabled: false }),
    ).toBe(true);
  });

  it("rejects creators and disabled staff", () => {
    expect(
      canManageCms({ role: "CREATOR", isAdmin: false, isDisabled: false }),
    ).toBe(false);
    expect(
      canManageCms({ role: "EDITOR", isAdmin: false, isDisabled: true }),
    ).toBe(false);
  });
});
