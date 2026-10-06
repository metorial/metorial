import { Buffer } from 'node:buffer';
import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
import type { z } from 'zod';
export type Row = Record<string, unknown>;
export function fail(message: string, reason = 'cloudinary_validation'): never {
  throw createApiServiceError(message, { reason, parent: {} });
}
export function text(value: unknown, label: string): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  )
    fail(`${label} must be non-empty and contain no control characters.`);
  return value;
}
export function segment(value: string, label: string): string {
  text(value, label);
  if (value.split('/').some(part => part === '.' || part === '..'))
    fail(`${label} must not contain relative path segments.`);
  try {
    return encodeURIComponent(value).replace(
      /[!'()*]/g,
      char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
    );
  } catch {
    fail(`${label} must be valid Unicode.`);
  }
}
export function page(maxResults?: number, nextCursor?: string): Row {
  if (
    maxResults !== undefined &&
    (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 500)
  )
    fail('maxResults must be an integer from 1 to 500.');
  if (nextCursor !== undefined) text(nextCursor, 'nextCursor');
  return {
    ...(maxResults !== undefined ? { max_results: maxResults } : {}),
    ...(nextCursor !== undefined ? { next_cursor: nextCursor } : {})
  };
}
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    fail(
      'Cloudinary returned an unexpected response. Read current state before retrying; a write may have completed.',
      'cloudinary_invalid_response'
    );
  return result.data;
}
export function row(value: unknown): Row {
  if (!isApiErrorRecord(value))
    fail(
      'Cloudinary did not return the documented object. Read current state before retrying.',
      'cloudinary_invalid_response'
    );
  return value;
}
export function credentials(apiKey: string, apiSecret: string): string {
  text(apiKey, 'API key');
  text(apiSecret, 'API secret');
  if (apiKey.includes(':')) fail('The API key must not contain a colon.');
  return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`;
}
export function apiError(error: unknown, operation: string): never {
  if (error instanceof ServiceError) throw error;
  let status = getApiErrorStatus(error);
  if (isApiErrorRecord(error) && error.name === 'SlateError' && isApiErrorRecord(error.data)) {
    const baggage = isApiErrorRecord(error.data.baggage) ? error.data.baggage : undefined;
    const original =
      baggage && isApiErrorRecord(baggage.serviceErrorData)
        ? baggage.serviceErrorData.upstreamStatus
        : undefined;
    if (
      typeof original === 'number' &&
      Number.isInteger(original) &&
      original >= 100 &&
      original <= 599
    )
      status = original;
  }
  throw buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Cloudinary',
      operation,
      reason: 'cloudinary_api_error',
      parent: {},
      extractMessage: () =>
        ' Check credentials, permissions and current asset state before retrying; a write may have completed.'
    }
  );
}
export function privateResponse(
  value: unknown,
  auth: { token: string; apiSecret: string }
): unknown {
  const redactor = new AuthConfigSecretRedactor({
    ...auth,
    authorization: credentials(auth.token, auth.apiSecret),
    encodedCredentials: Buffer.from(`${auth.token}:${auth.apiSecret}`).toString('base64'),
    encodedSecret: Buffer.from(auth.apiSecret).toString('base64'),
    encodedSecretUrl: Buffer.from(auth.apiSecret).toString('base64url')
  });
  const visit = (item: unknown): void => {
    if (typeof item === 'string') {
      let decoded = item;
      for (let n = 0; n <= 3; n++) {
        if (redactor.redactEmbedded(decoded) !== decoded)
          fail(
            'Cloudinary returned authentication data unexpectedly. Check the connection and request current state.',
            'cloudinary_private_response'
          );
        try {
          const next = decodeURIComponent(decoded);
          if (next === decoded) break;
          decoded = next;
        } catch {
          break;
        }
      }
    } else if (Array.isArray(item)) item.forEach(visit);
    else if (isApiErrorRecord(item))
      for (const [key, child] of Object.entries(item)) {
        visit(key);
        visit(child);
      }
  };
  visit(value);
  return value;
}
export function pairs(
  value: Record<string, string>,
  kind: 'context' | 'metadata' = 'context'
): string {
  if (kind === 'context' && Object.keys(value).length > 1000)
    fail('Context supports at most 1000 key/value pairs.');
  const escapePair = (part: string) =>
    part.replace(kind === 'context' ? /[\\|=]/g : /[\\|="]/g, '\\$&');
  return Object.entries(value)
    .map(([key, val]) => {
      text(key, 'Metadata key');
      if (
        kind === 'context' &&
        (key.length > 1024 ||
          val.length > 1024 ||
          val.length === 0 ||
          Array.from(val).some(char => char.charCodeAt(0) < 32 && char.charCodeAt(0) !== 10))
      )
        fail(
          'Context keys and values must be non-empty, at most 1024 characters and contain no control characters except newline.'
        );
      for (const part of [key, val])
        if (Buffer.from(part, 'utf8').toString('utf8') !== part)
          fail('Metadata keys and values must be valid UTF-8.');
      return `${escapePair(key)}=${escapePair(val)}`;
    })
    .join('|');
}
export function tags(value: string[]): string {
  if (
    value.length > 1000 ||
    value.some(
      tag =>
        !tag.trim() ||
        tag.length > 255 ||
        tag.includes(',') ||
        Array.from(tag).some(char => char.charCodeAt(0) < 32)
    )
  )
    fail(
      'Each tag must be non-empty, at most 255 characters and contain no comma or control characters; at most 1000 tags are supported.'
    );
  return value.join(',');
}
export function ids(value: string[], limit: number): string[] {
  if (!value.length || value.length > limit || new Set(value).size !== value.length)
    fail(`Provide between 1 and ${limit} distinct public IDs.`);
  value.forEach(id => segment(id, 'Public ID'));
  return value;
}
