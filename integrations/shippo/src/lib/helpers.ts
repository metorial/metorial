import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';

export const ORIGIN = 'https://api.goshippo.com';
export const API_VERSION = '2018-02-08';
export type Auth = { token: string; tokenType?: 'ShippoToken' | 'Bearer' };
export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'shippo_validation' });
export function text(value: unknown, label: string): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw invalid(`${label} must be a nonempty string without control characters.`);
  return value;
}
export function objectId(value: unknown): string {
  const id = text(value, 'Object ID');
  if (!/^[A-Za-z0-9_-]+$/.test(id))
    throw invalid('Use the exact Shippo object ID, without a URL or path.');
  return id;
}
export function authScheme(auth: Auth): 'ShippoToken' | 'Bearer' {
  text(auth.token, 'Token');
  if (/\s/.test(auth.token)) throw invalid('The token must not contain whitespace.');
  if (auth.tokenType !== undefined && !['ShippoToken', 'Bearer'].includes(auth.tokenType))
    throw invalid('Reconnect with a supported API-token or OAuth authentication mode.');
  return auth.tokenType ?? (auth.token.startsWith('oauth.') ? 'Bearer' : 'ShippoToken');
}
export function positiveInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0)
    throw invalid(`${label} must be a positive safe integer.`);
  return value;
}
export function decimal(value: unknown, label: string, allowZero = false): string {
  if (
    typeof value !== 'string' ||
    !/^\d+(?:\.\d+)?$/.test(value) ||
    (!allowZero && !/[1-9]/.test(value))
  )
    throw invalid(
      `${label} requires a ${allowZero ? 'nonnegative' : 'positive'} exact decimal string.`
    );
  return value;
}
export function timestamp(value: unknown, label: string, allowDate = false): string {
  const s = text(value, label);
  if (allowDate && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const date = new Date(`${s}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== s)
      throw invalid(`${label} is not a real calendar date.`);
    return date.toISOString();
  }
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(s) ||
    !Number.isFinite(Date.parse(s))
  )
    throw invalid(`${label} requires an ISO date-time with a timezone.`);
  const day = new Date(`${s.slice(0, 10)}T00:00:00Z`);
  if (day.toISOString().slice(0, 10) !== s.slice(0, 10))
    throw invalid(`${label} is not a real calendar date.`);
  return s;
}
export function record(value: unknown): Record<string, unknown> {
  if (!isApiErrorRecord(value)) throw invalid('Shippo returned an invalid object.');
  return value;
}
export function variants(token: string): string[] {
  return [
    ...new Set([
      token,
      encodeURIComponent(token),
      Buffer.from(token).toString('base64'),
      Buffer.from(token).toString('base64url'),
      Buffer.from(`Bearer ${token}`).toString('base64'),
      Buffer.from(`ShippoToken ${token}`).toString('base64')
    ])
  ].filter(Boolean);
}
export function safeData(
  value: unknown,
  token: string,
  depth = 0,
  fieldPath: string[] = [],
  carrierTemplates = false
): unknown {
  if (depth > 32) throw invalid('Shippo returned excessively nested data.');
  if (typeof value === 'string') {
    let decoded = value;
    const secrets = variants(token);
    for (let level = 0; level < 5; level++) {
      if (secrets.some(secret => decoded.includes(secret)))
        throw invalid(
          'Shippo returned credential-bearing data. Contact the account administrator.'
        );
      let next: string;
      try {
        next = decodeURIComponent(decoded);
      } catch {
        next = decoded.replace(/(?:%[0-9a-f]{2})+/gi, part =>
          Buffer.from(part.replaceAll('%', ''), 'hex').toString()
        );
      }
      if (next === decoded) break;
      decoded = next;
    }
    return value;
  }
  if (
    typeof value === 'number' &&
    (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))
  )
    throw invalid('Shippo returned a number that cannot be represented exactly.');
  if (Array.isArray(value))
    return value.map((v, i) =>
      safeData(v, token, depth + 1, [...fieldPath, String(i)], carrierTemplates)
    );
  if (isApiErrorRecord(value))
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => {
          const publicToken =
            k === 'token' &&
            ((fieldPath.length === 1 && fieldPath[0] === 'servicelevel') ||
              (fieldPath.length === 2 &&
                fieldPath[0] === 'rate' &&
                fieldPath[1] === 'servicelevel') ||
              (fieldPath.length === 3 &&
                ['rates', 'results'].includes(fieldPath[0] ?? '') &&
                fieldPath[2] === 'servicelevel') ||
              (carrierTemplates && fieldPath.length === 2 && fieldPath[0] === 'results'));
          return (
            publicToken ||
            !/^(?:parameters|password|api_password|secret|client_secret|access_token|refresh_token|token|authorization)$/i.test(
              k
            )
          );
        })
        .map(([k, v]) => {
          safeData(k, token, depth + 1);
          return [k, safeData(v, token, depth + 1, [...fieldPath, k], carrierTemplates)];
        })
    );
  if (value === null || ['number', 'boolean'].includes(typeof value)) return value;
  throw invalid('Shippo returned an invalid JSON value.');
}
export function upstream(error: unknown, operation: string, primary = false) {
  if (!primary && error instanceof ServiceError) return error;
  let status = getApiErrorStatus(error);
  const data =
    isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : undefined;
  const baggage = data && isApiErrorRecord(data.baggage) ? data.baggage : undefined;
  const serviceData =
    baggage && isApiErrorRecord(baggage.serviceErrorData)
      ? baggage.serviceErrorData
      : undefined;
  const mapped = data?.upstreamStatus ?? serviceData?.upstreamStatus;
  if (typeof mapped === 'number' && Number.isInteger(mapped) && mapped >= 100 && mapped <= 599)
    status = mapped;
  const message =
    status === 401
      ? 'Authentication failed. Reconnect with the correct API token or OAuth account.'
      : status === 403
        ? 'Access denied. Check account permissions, partner eligibility and resource ownership.'
        : status === 404
          ? 'The resource is unavailable. Check its exact ID and test/live mode; older shipments may no longer be retrievable.'
          : status === 429
            ? 'Shippo rate-limited the request. Wait before retrying.'
            : 'Shippo could not complete the request. Check the account history before retrying an ambiguous write.';
  return buildApiServiceError(
    { response: status === undefined ? {} : { status } },
    {
      providerLabel: 'Shippo',
      operation,
      reason: 'shippo_api_error',
      extractMessage: () => message,
      parent: {}
    }
  );
}
