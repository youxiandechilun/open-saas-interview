import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider, resolvePreferredLocale, useI18n } from "./I18nProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { getMessage, messages } from "./messages";

describe("i18n", () => {
  it("prefers a persisted choice over the browser language", () => {
    expect(resolvePreferredLocale("en", ["zh-CN"])).toBe("en");
    expect(resolvePreferredLocale("zh-CN", ["en-US"])).toBe("zh-CN");
  });

  it("maps Chinese browser variants and otherwise falls back to English", () => {
    expect(resolvePreferredLocale(null, ["zh-Hant-TW", "en-US"])).toBe("zh-CN");
    expect(resolvePreferredLocale(null, ["en-GB"])).toBe("en");
    expect(resolvePreferredLocale("unsupported", ["fr-FR"])).toBe("en");
  });

  it("provides typed English messages during SSR", () => {
    function Probe() {
      const { locale, t, toggleLocale } = useI18n();
      void toggleLocale;
      return <span>{`${locale}:${t("nav.blog")}`}</span>;
    }

    const markup = renderToStaticMarkup(
      <I18nProvider>
        <Probe />
        <LanguageSwitcher />
      </I18nProvider>,
    );

    expect(markup).toContain("en:Blog");
    expect(markup).toContain('aria-label="Language"');
    expect(markup).toContain('aria-pressed="true"');
    expect(getMessage("zh-CN", "menu.contentCms")).toBe("文章与发布");
    expect(getMessage("zh-CN", "auth.reset.request.title")).toBe("重置密码");
    expect(getMessage("zh-CN", "auth.verify.title")).toBe("验证邮箱");
  });

  it("interpolates variables and keeps missing ones intact", () => {
    expect(getMessage("en", "common.welcome", { name: "Ada" })).toBe(
      "Welcome, Ada",
    );
    expect(getMessage("en", "common.welcome")).toBe("Welcome, {name}");
  });

  it("keeps the product dictionaries aligned", () => {
    expect(Object.keys(messages["zh-CN"]).sort()).toEqual(
      Object.keys(messages.en).sort(),
    );
    expect(getMessage("zh-CN", "landing.hero.getStarted")).toBe("创建工作区");
    expect(getMessage("zh-CN", "landing.features.seo.name")).toBe(
      "SEO 质量门禁",
    );
  });
});
