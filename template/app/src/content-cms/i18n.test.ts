import { describe, expect, it } from "vitest";
import {
  getCmsAnimationVideoStatusLabel,
  getCmsPublicationStatusLabel,
  getCmsSeoIssueLabel,
  getCmsStatusLabel,
  getCmsText,
} from "./i18n";
import type { CmsSeoIssueCode } from "./types";

describe("content CMS copy", () => {
  it("formats variables in both locales", () => {
    expect(getCmsText("en", "pagination", { page: 2, totalPages: 5 })).toBe(
      "Page 2 of 5",
    );
    expect(getCmsText("zh-CN", "pagination", { page: 2, totalPages: 5 })).toBe(
      "第 2 页，共 5 页",
    );
  });

  it("localizes every post status", () => {
    expect(getCmsStatusLabel("en", "PUBLISHED")).toBe("Published");
    expect(getCmsStatusLabel("zh-CN", "PUBLISHED")).toBe("已发布");
  });

  it("provides a Chinese message for every SEO issue code", () => {
    const issueCodes: CmsSeoIssueCode[] = [
      "TITLE_MISSING",
      "TITLE_LENGTH",
      "EXCERPT_MISSING",
      "EXCERPT_LENGTH",
      "CONTENT_TOO_SHORT",
      "AUTHOR_MISSING",
      "SLUG_INVALID",
      "DUPLICATE_H1",
      "H2_MISSING",
      "INTERNAL_LINK_MISSING",
      "IMAGE_ALT_MISSING",
    ];

    for (const code of issueCodes) {
      expect(getCmsSeoIssueLabel("zh-CN", code)).toBeTruthy();
      expect(getCmsSeoIssueLabel("zh-CN", code)).not.toBe(
        getCmsSeoIssueLabel("en", code),
      );
    }
  });

  it("explains disabled publication integration", () => {
    expect(getCmsPublicationStatusLabel("en", "DISABLED")).toBe(
      "Integration disabled",
    );
    expect(getCmsPublicationStatusLabel("zh-CN", "DISABLED")).toBe(
      "集成未启用",
    );
  });

  it("labels an acknowledged webhook as dispatched, not deployed", () => {
    expect(getCmsPublicationStatusLabel("en", "PROCESSED")).toBe("Dispatched");
    expect(getCmsPublicationStatusLabel("zh-CN", "PROCESSED")).toBe(
      "已触发同步",
    );
  });

  it("localizes animation video status", () => {
    expect(getCmsAnimationVideoStatusLabel("en", "SUCCEEDED")).toBe("Ready");
    expect(getCmsAnimationVideoStatusLabel("zh-CN", "PROCESSING")).toBe(
      "处理中",
    );
  });

  it("localizes team animation ownership and publishability guidance", () => {
    expect(getCmsText("en", "animationOwner", { owner: "Ada" })).toBe(
      "Created by Ada",
    );
    expect(getCmsText("zh-CN", "animationOwner", { owner: "Ada" })).toBe(
      "创建者：Ada",
    );
    expect(getCmsText("zh-CN", "animationNotPublishable")).toContain(
      "暂不可发布",
    );
  });
});
