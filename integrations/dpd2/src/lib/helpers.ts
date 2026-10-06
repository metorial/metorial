import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';

export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'dpd2_validation', parent: {} });
export function nonempty(value: string, label: string): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  )
    throw invalid(`${label} must be nonempty and contain no control characters.`);
  try {
    encodeURIComponent(value);
  } catch {
    throw invalid(`${label} must contain valid Unicode.`);
  }
  return value;
}
export function id(value: number, label = 'Resource ID'): number {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw invalid(
      `${label} must be a positive safe integer. Use the exact ID returned by a list tool.`
    );
  return value;
}
export function pageNumber(value: number | undefined): number {
  const page = value ?? 1;
  if (!Number.isSafeInteger(page) || page < 1 || page >= Number.MAX_SAFE_INTEGER)
    throw invalid('page must be a positive safe integer with room for a following page.');
  return page;
}
export function credentialVariants(username: string, token: string): string[] {
  return [
    ...new Set([
      token,
      encodeURIComponent(token),
      Buffer.from(token).toString('base64'),
      Buffer.from(token).toString('base64url'),
      Buffer.from(`${username}:${token}`).toString('base64')
    ])
  ].filter(Boolean);
}
export function guardCredentialReflection(
  value: unknown,
  username: string,
  token: string,
  depth = 0
): void {
  if (depth > 32) throw invalid('DPD returned excessively nested data. Contact DPD support.');
  if (typeof value === 'string') {
    const redactor = new AuthConfigSecretRedactor({ token });
    const secrets = credentialVariants(username, token);
    let decoded = value;
    for (let level = 0; level <= 3; level++) {
      if (
        redactor.redactEmbedded(decoded) !== decoded ||
        secrets.some(secret => decoded.includes(secret))
      )
        throw invalid(
          'DPD data contains API credentials. Remove them from ordinary fields; reconnect and contact DPD support if they were returned by the service.'
        );
      try {
        const next = decodeURIComponent(decoded);
        if (next === decoded) break;
        decoded = next;
      } catch {
        const next = decoded.replace(/(?:%[0-9a-f]{2})+/gi, part =>
          Buffer.from(part.replace(/%/g, ''), 'hex').toString('utf8')
        );
        if (next === decoded) break;
        decoded = next;
      }
    }
  }
  if (
    typeof value === 'number' &&
    (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))
  )
    throw invalid(
      'DPD returned an unsafe number. Contact DPD support for an exact representation.'
    );
  if (Array.isArray(value))
    for (const item of value) guardCredentialReflection(item, username, token, depth + 1);
  else if (isApiErrorRecord(value))
    for (const [key, item] of Object.entries(value)) {
      guardCredentialReflection(key, username, token, depth + 1);
      guardCredentialReflection(item, username, token, depth + 1);
    }
}
export function upstream(error: unknown, operation: string, preserveLocal = true) {
  if (preserveLocal && error instanceof ServiceError) return error;
  let status = getApiErrorStatus(error);
  if (isApiErrorRecord(error) && isApiErrorRecord(error.data)) {
    const data = error.data;
    const baggage = isApiErrorRecord(data.baggage) ? data.baggage : undefined;
    const service =
      baggage && isApiErrorRecord(baggage.serviceErrorData)
        ? baggage.serviceErrorData
        : undefined;
    const mapped = data.upstreamStatus ?? service?.upstreamStatus;
    if (
      typeof mapped === 'number' &&
      Number.isInteger(mapped) &&
      mapped >= 100 &&
      mapped <= 599
    )
      status = mapped;
  }
  const message =
    status === 401
      ? 'DPD authentication failed. Reconnect with the account username and API password from the DPD profile.'
      : status === 403
        ? 'DPD denied access. Check the account and storefront permissions.'
        : status === 404
          ? 'The DPD resource was not found. Use its exact ID and storefront from the list tools.'
          : status === 412
            ? 'DPD rejected the request. Check the documented fields and resource state.'
            : status === 429
              ? 'DPD rate-limited the request. Wait before retrying.'
              : 'The DPD request failed. Check service availability; do not retry a reactivation until its purchase state and possible email effects are reconciled.';
  return buildApiServiceError(
    { response: status === undefined ? {} : { status } },
    {
      providerLabel: 'Digital Product Delivery',
      reason: 'dpd2_api_error',
      operation,
      extractMessage: () => message,
      extractResponse: () => (status === undefined ? {} : { status }),
      parent: {}
    }
  );
}
