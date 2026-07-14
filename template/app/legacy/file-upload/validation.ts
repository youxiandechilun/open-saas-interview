// Set this to the max file size you want to allow (currently 5MB).
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/html",
  "video/quicktime",
  "video/mp4",
  "video/webm",
] as const;

export function isOwnedS3Key(s3Key: string, userId: string): boolean {
  if (!s3Key || !userId || s3Key.includes("..") || s3Key.includes("\\")) {
    return false;
  }
  const [owner, objectName, ...extra] = s3Key.split("/");
  return owner === userId && Boolean(objectName) && extra.length === 0;
}
