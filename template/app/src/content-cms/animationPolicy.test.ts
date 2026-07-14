import { describe, expect, it } from "vitest";
import {
  canAttachCmsAnimation,
  getCmsAnimationOwnerLabel,
  shouldValidateCmsAnimationChange,
} from "./animationPolicy";

describe("canAttachCmsAnimation", () => {
  const editor = {
    role: "EDITOR",
    isAdmin: false,
    isDisabled: false,
  } as const;
  const creator = {
    role: "CREATOR",
    isAdmin: false,
    isDisabled: false,
  } as const;
  const readyVideo = {
    id: "f7b8e395-8658-4f1d-8f74-f38ca971c536",
    status: "READY",
    videoStatus: "SUCCEEDED",
    videoFormat: "mp4",
    videoMimeType: "video/mp4",
    user: { isDisabled: false },
  };

  it("allows an editor to attach a publishable animation created by a teammate", () => {
    expect(canAttachCmsAnimation(editor, readyVideo)).toBe(true);
  });

  it("does not grant a creator CMS publishing rights", () => {
    expect(canAttachCmsAnimation(creator, readyVideo)).toBe(false);
  });

  it.each([
    { animation: null, description: "a missing animation" },
    {
      animation: { ...readyVideo, user: { isDisabled: true } },
      description: "an animation owned by a disabled teammate",
    },
    {
      animation: { ...readyVideo, status: "FAILED" },
      description: "a failed animation",
    },
    {
      animation: { ...readyVideo, videoStatus: "PROCESSING" },
      description: "an animation whose video is still processing",
    },
    {
      animation: { ...readyVideo, videoMimeType: "text/html" },
      description: "an animation with an unsafe video MIME type",
    },
  ] as const)("rejects $description", ({ animation }) => {
    expect(canAttachCmsAnimation(editor, animation)).toBe(false);
  });
});

describe("getCmsAnimationOwnerLabel", () => {
  it("prefers a username and otherwise returns one email label", () => {
    expect(
      getCmsAnimationOwnerLabel({
        username: "motion-maker",
        email: "maker@example.test",
      }),
    ).toBe("motion-maker");
    expect(
      getCmsAnimationOwnerLabel({
        username: null,
        email: "maker@example.test",
      }),
    ).toBe("maker@example.test");
    expect(
      getCmsAnimationOwnerLabel({ username: null, email: null }),
    ).toBeNull();
  });
});

describe("shouldValidateCmsAnimationChange", () => {
  it("validates a newly selected attachment", () => {
    expect(shouldValidateCmsAnimationChange(null, "animation-1")).toBe(true);
    expect(shouldValidateCmsAnimationChange("animation-1", "animation-2")).toBe(
      true,
    );
  });

  it("lets an editor preserve or remove an existing attachment", () => {
    expect(shouldValidateCmsAnimationChange("animation-1", "animation-1")).toBe(
      false,
    );
    expect(shouldValidateCmsAnimationChange("animation-1", null)).toBe(false);
  });
});
