import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(
  new URL("../../schema.prisma", import.meta.url),
  "utf8",
);

function model(name: string): string {
  const match = schema.match(
    new RegExp(`model ${name} \\{[\\s\\S]*?^\\}`, "m"),
  );
  if (!match) throw new Error(`Prisma model ${name} was not found.`);
  return match[0];
}

describe("CMS Prisma contract", () => {
  it("keeps publication event postId scalar so deletion events can outlive posts", () => {
    const publicationEvent = model("CmsPublicationEvent");

    expect(publicationEvent).toMatch(/^\s*postId\s+String\s*$/m);
    expect(publicationEvent).not.toContain("@relation");
    expect(publicationEvent).not.toMatch(/^\s*post\s+CmsPost/m);
  });

  it("nulls an article attachment when its animation is deleted", () => {
    const cmsPost = model("CmsPost");

    expect(cmsPost).toMatch(
      /animation\s+AiAnimation\?\s+@relation\(fields: \[animationId\], references: \[id\], onDelete: SetNull\)/,
    );
    expect(cmsPost).toMatch(/@@index\(\[animationId\]\)/);
  });
});
