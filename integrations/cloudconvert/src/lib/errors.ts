import { ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, createApiServiceError, getApiErrorStatus } from 'slates';

export const invalidInput = (message: string) =>
  createApiServiceError(message, { reason: 'invalid_input' });
export const invalidResponse = (
  message = 'CloudConvert returned an incomplete or invalid response. Read the existing job or task before repeating any operation.'
) => createApiServiceError(message, { reason: 'invalid_response' });
export const upstreamError = (error: unknown, operation: string, recovery?: string) => {
  if (error instanceof ServiceError) return error;
  const status = getApiErrorStatus(error);
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'CloudConvert',
      reason: 'cloudconvert_api',
      operation,
      parent: {},
      extractMessage: () =>
        recovery
          ? ` ${recovery}`
          : ' Check the connection, permissions, and request parameters.',
      extractUpstreamCode: () => undefined
    }
  );
};
export const containsCredential = (value: unknown, secrets: string[]) => {
  const variants = secrets
    .filter(Boolean)
    .flatMap(secret => [
      secret,
      Buffer.from(secret).toString('base64'),
      Buffer.from(secret).toString('base64url'),
      Buffer.from(`Bearer ${secret}`).toString('base64')
    ]);
  let count = 0;
  const visit = (entry: unknown, depth: number): boolean => {
    if (++count > 100000 || depth > 50) return true;
    if (typeof entry === 'string') {
      let text = entry;
      for (let round = 0; round < 5; round++) {
        if (variants.some(secret => text.includes(secret))) return true;
        for (const candidate of text.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g)) {
          const decoded = Buffer.from(candidate[0], 'base64').toString();
          if (variants.some(secret => decoded.includes(secret))) return true;
        }
        const decoded = text.replace(/%([0-9a-f]{2})/gi, (_, byte: string) =>
          String.fromCharCode(Number.parseInt(byte, 16))
        );
        if (decoded === text) break;
        text = decoded;
      }
      return false;
    }
    if (entry && typeof entry === 'object')
      return Object.entries(entry).some(
        ([key, item]) => visit(key, depth + 1) || visit(item, depth + 1)
      );
    return false;
  };
  return visit(value, 0);
};
