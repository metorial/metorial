import { ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, getApiErrorStatus } from 'slates';
export function apiFailure(error: unknown, operation: string) {
  if (error instanceof ServiceError) return error;
  const status = getApiErrorStatus(error);
  return buildApiServiceError(status === undefined ? {} : { response: { status } }, {
    providerLabel: 'imgix',
    operation,
    reason: 'imgix_api',
    parent: {},
    extractMessage: () => '',
    formatMessage: ({ status }) =>
      `imgix ${operation} failed${status === undefined ? '' : ` (HTTP ${status})`}. Check key permissions and resource state; do not automatically repeat mutations.`
  });
}
export function containsCredential(
  value: unknown,
  token: string,
  seen = new Set<object>()
): boolean {
  if (typeof value === 'string') {
    let current = value;
    for (let round = 0; round < 5; round++) {
      if (current.includes(token)) return true;
      for (const candidate of current.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g))
        if (Buffer.from(candidate[0], 'base64').toString().includes(token)) return true;
      const decoded = current.replace(/%([0-9a-f]{2})/gi, (_, byte: string) =>
        String.fromCharCode(Number.parseInt(byte, 16))
      );
      if (decoded === current) break;
      current = decoded;
    }
    return false;
  }
  if (!value || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  return Object.entries(value).some(
    ([key, part]) =>
      containsCredential(key, token, seen) || containsCredential(part, token, seen)
  );
}
