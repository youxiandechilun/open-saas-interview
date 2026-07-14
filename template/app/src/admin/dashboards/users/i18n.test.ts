import { describe, expect, it } from "vitest";
import { getUserAdminText, getUserRoleLabel } from "./i18n";

describe("user administration copy", () => {
  it("localizes workflow labels", () => {
    expect(getUserAdminText("en", "heading")).toBe("Users and roles");
    expect(getUserAdminText("zh-CN", "heading")).toBe("用户与角色");
    expect(getUserRoleLabel("zh-CN", "EDITOR")).toBe("编辑");
  });

  it("formats pagination variables", () => {
    expect(
      getUserAdminText("zh-CN", "pageOf", { page: 2, totalPages: 4 }),
    ).toBe("第 2 页，共 4 页");
  });
});
