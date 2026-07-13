import { timingSafeEqual } from "node:crypto";
import { env } from "wasp/server";
import { type GetPublishedCmsContentApi } from "wasp/server/api";
import { readPublishedCmsFeed } from "./operations";

export const getPublishedCmsContentApi: GetPublishedCmsContentApi = async (
  req,
  res,
) => {
  const requiredToken = env.CMS_CONTENT_API_TOKEN;
  if (
    requiredToken &&
    !tokensMatch(readBearerToken(req.headers.authorization), requiredToken)
  ) {
    res.setHeader("WWW-Authenticate", "Bearer");
    return res
      .status(401)
      .json({ message: "A valid CMS content token is required." });
  }

  const feed = await readPublishedCmsFeed();
  const etag = `"${feed.contentVersion}"`;
  res.setHeader(
    "Cache-Control",
    "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  );
  res.setHeader("ETag", etag);
  res.setHeader("Vary", "Authorization");
  if (feed.updatedAt)
    res.setHeader("Last-Modified", feed.updatedAt.toUTCString());
  if (req.headers["if-none-match"] === etag) return res.status(304).end();
  return res.status(200).json(feed);
};

function readBearerToken(header: string | undefined) {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function tokensMatch(received: string | undefined, expected: string) {
  if (!received) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}
