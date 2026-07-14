import { describe, expect, it } from "vitest";
import { getConfig } from "./Config";

describe("cookie consent translations", () => {
  it("uses the application locale and provides both dictionaries", () => {
    const config = getConfig("zh-CN", "localhost");

    expect(config.language.default).toBe("zh-CN");
    expect(config.cookie?.domain).toBe("localhost");
    expect(config.language.translations.en).toMatchObject({
      consentModal: { title: "We use cookies" },
    });
    expect(config.language.translations["zh-CN"]).toMatchObject({
      consentModal: {
        title: "我们使用 Cookie",
        acceptAllBtn: "全部接受",
        acceptNecessaryBtn: "仅保留必要项",
      },
    });
  });
});
