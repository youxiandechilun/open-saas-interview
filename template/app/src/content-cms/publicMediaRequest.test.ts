import { describe, expect, it, vi } from "vitest";
import {
  CMS_PUBLIC_MEDIA_NOT_FOUND,
  getCmsPublicMediaLookupWhere,
  sendCmsPublicMediaNotFound,
} from "./publicMediaRequest";

describe("public CMS media request policy", () => {
  it("requires a publishable video referenced by a published article", () => {
    expect(getCmsPublicMediaLookupWhere("animation-1")).toEqual({
      id: "animation-1",
      status: "READY",
      videoStatus: "SUCCEEDED",
      cmsPosts: { some: { status: "PUBLISHED" } },
    });
  });

  it("uses one non-enumerating 404 response", () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));

    sendCmsPublicMediaNotFound({ status });

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(CMS_PUBLIC_MEDIA_NOT_FOUND);
  });
});
