import { describe, expect, it } from "vitest";
import {
  CMS_PUBLIC_MEDIA_CACHE_CONTROL,
  getCmsPublicMediaDescriptor,
  isCmsPublicMediaId,
  safeCmsMediaFilename,
} from "./publicMedia";

const readyVideo = {
  id: "f7b8e395-8658-4f1d-8f74-f38ca971c536",
  status: "READY",
  videoStatus: "SUCCEEDED",
  videoFormat: "mp4",
  videoMimeType: "video/mp4",
};

describe("public CMS animation media", () => {
  it("publishes only a stable media path and trusted MIME type", () => {
    expect(getCmsPublicMediaDescriptor(readyVideo)).toEqual({
      path: "/content-cms/media/f7b8e395-8658-4f1d-8f74-f38ca971c536",
      format: "mp4",
      mimeType: "video/mp4",
    });
    expect(CMS_PUBLIC_MEDIA_CACHE_CONTROL).toContain("public");
  });

  it.each([
    { status: "FAILED" },
    { videoStatus: "PROCESSING" },
    { videoFormat: "mov", videoMimeType: "video/quicktime" },
    { videoMimeType: "text/html" },
    { id: "not-a-uuid" },
  ])("withholds unsafe or unavailable media: %j", (override) => {
    expect(
      getCmsPublicMediaDescriptor({ ...readyVideo, ...override }),
    ).toBeNull();
  });

  it("sanitizes the inline filename", () => {
    expect(safeCmsMediaFilename(' Launch: demo "one" ')).toBe(
      "Launch-demo-one",
    );
  });

  it("rejects malformed route identifiers before lookup", () => {
    expect(isCmsPublicMediaId(readyVideo.id)).toBe(true);
    expect(isCmsPublicMediaId("../video.mp4")).toBe(false);
  });
});
