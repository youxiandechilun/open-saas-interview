import { createHash } from "node:crypto";

export function createProviderConfigFingerprint(input: {
  baseUrl: string;
  model: string;
  apiKey: string;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        baseUrl: input.baseUrl,
        model: input.model,
        apiKey: input.apiKey,
      }),
    )
    .digest("hex");
}
