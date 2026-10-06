import { Buffer } from 'node:buffer';
import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import type { z } from 'zod';

export function fail(message: string, reason = 'invalid_input'): never {
  throw createApiServiceError(message, { reason, parent: {} });
}
export const retiredAuth = (): never =>
  fail(
    'Harvest v1/v2 and API keys became unavailable after August 31, 2026. Reconnect using Harvest v3 custom client credentials or an approved Greenhouse partner OAuth application. Set the acting user during authentication, rather than using the retired On-Behalf-Of configuration.',
    'reauthentication_required'
  );
export const id = (value: unknown, field = 'Resource ID'): number => {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
  if (
    typeof value === 'string' &&
    /^[1-9]\d*$/.test(value) &&
    Number.isSafeInteger(Number(value))
  )
    return Number(value);
  return fail(
    `${field} must be an exact positive integer ID from Greenhouse, within the safe integer range.`
  );
};
export const optionalId = (value: unknown, field: string) =>
  value === undefined ? undefined : id(value, field);
export const opaque = (value: unknown, field: string): string => {
  if (
    typeof value === 'string' &&
    value.length > 0 &&
    value === value.trim() &&
    !Array.from(value).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    return value;
  return fail(`${field} must be the exact nonempty value supplied by Greenhouse.`);
};
export const timestamp = (value: string, field: string): string => {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    return fail(`${field} must be a valid ISO 8601 timestamp with a timezone.`);
  const date = value.slice(0, 10);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (parsed.toISOString().slice(0, 10) !== date)
    return fail(`${field} must use a valid calendar date.`);
  return value;
};
export const errorFor = (error: unknown, operation: string) => {
  if (error instanceof ServiceError) return error;
  let status = getApiErrorStatus(error);
  if (
    isApiErrorRecord(error) &&
    isApiErrorRecord(error.data) &&
    isApiErrorRecord(error.data.baggage) &&
    isApiErrorRecord(error.data.baggage.serviceErrorData)
  ) {
    const wrapped = error.data.baggage.serviceErrorData.upstreamStatus;
    if (
      typeof wrapped === 'number' &&
      Number.isInteger(wrapped) &&
      wrapped >= 100 &&
      wrapped <= 599
    )
      status = wrapped;
  }
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Greenhouse',
      operation,
      reason: 'greenhouse_api_error',
      parent: {},
      extractMessage: () =>
        status === 401
          ? 'Reconnect with valid Harvest v3 credentials.'
          : status === 403
            ? 'Grant this endpoint scope and Site Admin or integration service user access. Private data also requires the relevant advanced permissions. Reconnect after changing authorization.'
            : status === 429
              ? 'Wait for the rate limit to reset before retrying.'
              : 'Review the resource and requested fields in Greenhouse before retrying. A requested write may have completed; this operation is not automatically retried.'
    }
  );
};
export const parsed = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    return fail(
      'Greenhouse returned an invalid response. Review the resource before retrying; a requested write may have completed.',
      'invalid_response'
    );
  return result.data;
};
export const privateResponse = (value: unknown, auth: Record<string, unknown>) => {
  const redactor = new AuthConfigSecretRedactor({
    token: auth.token,
    refreshToken: auth.refreshToken,
    clientSecret: auth.clientSecret,
    basicPayload:
      typeof auth.clientId === 'string' && typeof auth.clientSecret === 'string'
        ? Buffer.from(`${auth.clientId}:${auth.clientSecret}`, 'utf8').toString('base64')
        : undefined
  });
  const unsafeText = (entry: string): boolean => {
    let decoded = entry;
    for (let depth = 0; depth <= 3; depth++) {
      if (redactor.redactEmbedded(decoded) !== decoded) return true;
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
    return false;
  };
  const unsafe = (entry: unknown): boolean =>
    typeof entry === 'string'
      ? unsafeText(entry)
      : Array.isArray(entry)
        ? entry.some(unsafe)
        : !!entry &&
          typeof entry === 'object' &&
          Object.entries(entry).some(([key, nested]) => unsafeText(key) || unsafe(nested));
  if (unsafe(value))
    fail(
      'Greenhouse reflected a credential in resource data. Review the connection before retrying; a requested write may have completed.',
      'unsafe_response'
    );
};
export type ListInput = {
  page?: number;
  perPage?: number;
  cursor?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
};
export const listParams = (input: ListInput, filters: Record<string, unknown> = {}) => {
  if (input.page !== undefined && input.page !== 1)
    fail(
      'Harvest v3 uses cursor pagination. Omit page or use page 1; pass the returned nextCursor alone for subsequent pages.'
    );
  if (input.cursor !== undefined) {
    if (
      Object.entries(input).some(([key, value]) => key !== 'cursor' && value !== undefined) ||
      Object.values(filters).some(value => value !== undefined)
    )
      fail(
        'Pass cursor alone. Harvest v3 does not allow page, perPage, or filters with a cursor.'
      );
    return { cursor: opaque(input.cursor, 'Cursor') };
  }
  const perPage = input.perPage ?? 50;
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 500)
    fail('perPage must be a whole number between 1 and 500.');
  if (
    (input.createdAfter !== undefined || input.createdBefore !== undefined) &&
    (input.updatedAfter !== undefined || input.updatedBefore !== undefined)
  )
    fail(
      'Harvest v3 accepts a created date range or an updated date range, rather than both.'
    );
  const range = (after?: string, before?: string) => {
    if (after !== undefined) timestamp(after, 'After timestamp');
    if (before !== undefined) timestamp(before, 'Before timestamp');
    if (after !== undefined && before !== undefined && Date.parse(after) >= Date.parse(before))
      fail('The after timestamp must precede the before timestamp.');
    return (
      [
        after === undefined ? undefined : `gt|${after}`,
        before === undefined ? undefined : `lt|${before}`
      ]
        .filter(v => v !== undefined)
        .join('|') || undefined
    );
  };
  return pickDefined({
    per_page: perPage,
    created_at: range(input.createdAfter, input.createdBefore),
    updated_at: range(input.updatedAfter, input.updatedBefore),
    ...filters
  });
};
export const nextCursor = (headers: unknown, path: string): string | undefined => {
  const link = getResponseHeaderValue(headers, 'link');
  if (link === undefined || link === null || link === '') return undefined;
  if (typeof link !== 'string')
    return fail('Greenhouse returned an invalid pagination header.', 'invalid_response');
  const matches = Array.from(link.matchAll(/<([^>]+)>\s*;\s*rel="?next"?/g));
  if (!matches.length) return undefined;
  if (matches.length !== 1)
    return fail('Greenhouse returned ambiguous pagination links.', 'invalid_response');
  let url: URL;
  try {
    url = new URL(matches[0]?.[1] ?? '');
  } catch {
    return fail('Greenhouse returned an invalid next-page URL.', 'invalid_response');
  }
  if (
    url.origin !== 'https://harvest.greenhouse.io' ||
    url.pathname !== `/v3${path}` ||
    url.username ||
    url.password ||
    url.hash ||
    Array.from(url.searchParams.keys()).some(key => key !== 'cursor') ||
    url.searchParams.getAll('cursor').length !== 1
  )
    return fail('Greenhouse returned an invalid next-page URL.', 'invalid_response');
  return opaque(url.searchParams.get('cursor'), 'Returned cursor');
};
export const downloadUrl = (value: unknown): string => {
  const text = opaque(value, 'Download URL');
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return fail('Greenhouse did not return a valid download URL.', 'invalid_response');
  }
  if (url.protocol !== 'https:' || url.username || url.password)
    return fail('Greenhouse did not return a secure download URL.', 'invalid_response');
  return text;
};
