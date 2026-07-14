export type ActionLock<T> = { current: T | null };

export function tryAcquireAction<T>(lock: ActionLock<T>, action: T): boolean {
  if (lock.current !== null) return false;
  lock.current = action;
  return true;
}

export function releaseAction<T>(lock: ActionLock<T>, action: T): void {
  if (lock.current === action) lock.current = null;
}

export function requestFingerprint(
  operation: string,
  identity: readonly unknown[],
): string {
  return JSON.stringify([operation, ...identity]);
}

export function getOrCreateRequestKey(
  cache: Map<string, string>,
  fingerprint: string,
  prefix: string,
  createId: () => string = () => crypto.randomUUID(),
): string {
  const existing = cache.get(fingerprint);
  if (existing) return existing;
  const key = `${prefix}:${createId()}`;
  cache.set(fingerprint, key);
  return key;
}

export function settleRequestKey(
  cache: Map<string, string>,
  fingerprint: string,
  outcome: "completed" | "confirmed-failure" | "transport-failure",
): void {
  if (outcome !== "transport-failure") cache.delete(fingerprint);
}

export function isRetryableTransportFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!(error instanceof Error)) return false;
  return /failed to fetch|network|connection|load failed|timed?\s*out/i.test(
    error.message,
  );
}
