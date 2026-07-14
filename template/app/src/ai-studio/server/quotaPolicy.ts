export function calculateTokenReservation(input: {
  estimatedPromptTokens: number;
  requestedCompletionTokens: number;
  configuredMaxCompletionTokens: number;
}): { reservedTokens: number; maxCompletionTokens: number } {
  const estimatedPromptTokens = toNonNegativeInteger(
    input.estimatedPromptTokens,
  );
  const maxCompletionTokens = Math.min(
    toNonNegativeInteger(input.requestedCompletionTokens),
    toNonNegativeInteger(input.configuredMaxCompletionTokens),
  );
  return {
    reservedTokens: estimatedPromptTokens + maxCompletionTokens,
    maxCompletionTokens,
  };
}

export function tokenCapacityThreshold(
  hourlyTokenLimit: number,
  reservedTokens: number,
): number | null {
  const limit = toNonNegativeInteger(hourlyTokenLimit);
  const reservation = toNonNegativeInteger(reservedTokens);
  return reservation > limit ? null : limit - reservation;
}

export function calculateTokenSettlementDelta(input: {
  reservedTokens: number;
  promptTokens: number;
  completionTokens: number;
}): number {
  const actualTokens =
    toNonNegativeInteger(input.promptTokens) +
    toNonNegativeInteger(input.completionTokens);
  return actualTokens - toNonNegativeInteger(input.reservedTokens);
}

function toNonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
