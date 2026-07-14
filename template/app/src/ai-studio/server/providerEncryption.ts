import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const ENVELOPE_VERSION = "v1";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const AAD = Buffer.from("open-saas:ai-provider-config:v1", "utf8");

export class AiProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderConfigError";
  }
}

export function encryptApiKey(
  apiKey: string,
  encodedMasterKey: string,
): string {
  if (!apiKey) {
    throw new AiProviderConfigError("AI provider API key is missing");
  }

  const key = decodeMasterKey(encodedMasterKey);
  try {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(AAD);
    const ciphertext = Buffer.concat([
      cipher.update(apiKey, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      ENVELOPE_VERSION,
      iv.toString("base64url"),
      authTag.toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(".");
  } finally {
    key.fill(0);
  }
}

export function decryptApiKey(
  encryptedApiKey: string,
  encodedMasterKey: string,
): string {
  const parts = encryptedApiKey.split(".");
  if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
    throw new AiProviderConfigError(
      "Stored AI provider credentials are not readable",
    );
  }

  const key = decodeMasterKey(encodedMasterKey);
  try {
    const iv = decodeEnvelopePart(parts[1]);
    const authTag = decodeEnvelopePart(parts[2]);
    const ciphertext = decodeEnvelopePart(parts[3]);
    if (
      iv.length !== IV_BYTES ||
      authTag.length !== AUTH_TAG_BYTES ||
      ciphertext.length === 0
    ) {
      throw new AiProviderConfigError(
        "Stored AI provider credentials are not readable",
      );
    }

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(AAD);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    if (error instanceof AiProviderConfigError) throw error;
    throw new AiProviderConfigError(
      "Stored AI provider credentials are not readable",
    );
  } finally {
    key.fill(0);
  }
}

export function createApiKeyHint(apiKey: string): string {
  const trimmed = apiKey.trim();
  return trimmed.length > 8 ? `****${trimmed.slice(-4)}` : "****";
}

export function validateMasterKey(encodedMasterKey: string | undefined): void {
  const key = decodeMasterKey(encodedMasterKey);
  key.fill(0);
}

export function isValidMasterKey(
  encodedMasterKey: string | undefined,
): boolean {
  try {
    validateMasterKey(encodedMasterKey);
    return true;
  } catch {
    return false;
  }
}

function decodeMasterKey(encodedMasterKey: string | undefined): Buffer {
  const value = encodedMasterKey?.trim();
  if (!value) {
    throw new AiProviderConfigError(
      "AI_CONFIG_ENCRYPTION_KEY is not configured",
    );
  }

  let decoded: Buffer;
  if (/^[a-f\d]{64}$/i.test(value)) {
    decoded = Buffer.from(value, "hex");
  } else if (/^[A-Za-z\d+/_-]+={0,2}$/.test(value)) {
    decoded = Buffer.from(
      value,
      value.includes("-") || value.includes("_") ? "base64url" : "base64",
    );
  } else {
    throw invalidMasterKeyError();
  }

  if (decoded.length !== 32) throw invalidMasterKeyError();
  return decoded;
}

function decodeEnvelopePart(value: string | undefined): Buffer {
  if (!value || !/^[A-Za-z\d_-]+$/.test(value)) {
    throw new AiProviderConfigError(
      "Stored AI provider credentials are not readable",
    );
  }
  return Buffer.from(value, "base64url");
}

function invalidMasterKeyError(): AiProviderConfigError {
  return new AiProviderConfigError(
    "AI_CONFIG_ENCRYPTION_KEY must decode to exactly 32 bytes",
  );
}
