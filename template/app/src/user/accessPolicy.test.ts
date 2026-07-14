import { describe, expect, it } from "vitest";
import {
  getEffectiveUserRole,
  getInitialUserRole,
  getSelfAccessChangeViolation,
  hasActiveAdminAccess,
  hasActivePublishingAccess,
  isActiveAdministrator,
  removesActiveAdministrator,
} from "./accessPolicy";

describe("user access policy", () => {
  it("keeps signup administrator flags and roles synchronized", () => {
    expect(getInitialUserRole(true)).toBe("ADMIN");
    expect(getInitialUserRole(false)).toBe("CREATOR");
  });

  it("keeps legacy isAdmin users compatible with the ADMIN role", () => {
    const legacyAdmin = {
      id: "legacy-admin",
      role: "CREATOR" as const,
      isAdmin: true,
      isDisabled: false,
    };

    expect(getEffectiveUserRole(legacyAdmin)).toBe("ADMIN");
    expect(isActiveAdministrator(legacyAdmin)).toBe(true);
  });

  it("does not treat a disabled administrator as active", () => {
    expect(
      isActiveAdministrator({
        role: "ADMIN",
        isAdmin: true,
        isDisabled: true,
      }),
    ).toBe(false);
    expect(
      hasActiveAdminAccess({
        role: "ADMIN",
        isAdmin: true,
        isDisabled: true,
      }),
    ).toBe(false);
  });

  it("allows editors to publish without granting administration", () => {
    const editor = { role: "EDITOR" as const, isDisabled: false };

    expect(hasActivePublishingAccess(editor)).toBe(true);
    expect(hasActiveAdminAccess(editor)).toBe(false);
    expect(hasActivePublishingAccess({ role: "CREATOR" })).toBe(false);
    expect(
      hasActivePublishingAccess({ role: "EDITOR", isDisabled: true }),
    ).toBe(false);
  });

  it("blocks self-demotion and self-disable while allowing a no-op", () => {
    expect(
      getSelfAccessChangeViolation("admin", "admin", {
        role: "EDITOR",
        isDisabled: false,
      }),
    ).toBe("SELF_DEMOTION");
    expect(
      getSelfAccessChangeViolation("admin", "admin", {
        role: "ADMIN",
        isDisabled: true,
      }),
    ).toBe("SELF_DISABLE");
    expect(
      getSelfAccessChangeViolation("admin", "admin", {
        role: "ADMIN",
        isDisabled: false,
      }),
    ).toBeNull();
  });

  it("identifies changes that require the final-admin safeguard", () => {
    const admin = { role: "ADMIN" as const, isAdmin: true, isDisabled: false };

    expect(
      removesActiveAdministrator(admin, {
        role: "EDITOR",
        isDisabled: false,
      }),
    ).toBe(true);
    expect(
      removesActiveAdministrator(admin, {
        role: "ADMIN",
        isDisabled: false,
      }),
    ).toBe(false);
  });
});
