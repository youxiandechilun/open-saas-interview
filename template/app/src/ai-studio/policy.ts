export const AI_HOURLY_REQUEST_LIMIT = 20;
export const AI_HOURLY_TOKEN_LIMIT = 100_000;
export const AI_MAX_CONCURRENT_REQUESTS = 2;
export const AI_MAX_PROMPT_LENGTH = 4_000;
export const VIDEO_MAX_ATTEMPTS = 3;

export function startOfUtcHour(date: Date): Date {
  const start = new Date(date);
  start.setUTCMinutes(0, 0, 0);
  return start;
}

export function canReserveCapacity(input: {
  requestCount: number;
  inFlight: number;
  requestLimit?: number;
  concurrencyLimit?: number;
}): boolean {
  const requestLimit = input.requestLimit ?? AI_HOURLY_REQUEST_LIMIT;
  const concurrencyLimit = input.concurrencyLimit ?? AI_MAX_CONCURRENT_REQUESTS;

  return input.requestCount < requestLimit && input.inFlight < concurrencyLimit;
}

export function quotaRemaining(requestCount: number, limit: number): number {
  return Math.max(0, limit - requestCount);
}

export function normalizeIdempotencyKey(key: string): string {
  return key.trim().toLowerCase();
}

export function isValidIdempotencyKey(key: string): boolean {
  return /^[a-z0-9][a-z0-9._:-]{7,127}$/i.test(key);
}

export function calculateEstimatedCostMicros(input: {
  promptTokens: number;
  completionTokens: number;
}): number {
  // A transparent estimate, not billing truth: $0.15/M input + $0.60/M output.
  return Math.round(input.promptTokens * 0.15 + input.completionTokens * 0.6);
}
