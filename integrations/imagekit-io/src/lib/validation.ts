import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
import type { z } from 'zod';

export const invalid = (message: string, data?: Record<string, unknown>) =>
  createApiServiceError(message, { reason: 'imagekit_validation', ...data });

export function text(value: unknown, label: string): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw invalid(`${label} must be nonempty and contain no control characters.`);
  return value;
}
export function id(value: unknown): string {
  const result = text(value, 'Resource ID');
  if (!/^[A-Za-z0-9_-]+$/.test(result))
    throw invalid('Use the exact resource ID returned by ImageKit, without a URL or path.');
  return result;
}
export function token(value: unknown): string {
  const result = text(value, 'Private API key');
  if (!result.startsWith('private_') || /\s|:/.test(result))
    throw invalid('Reconnect with an ImageKit private API key, not a public key.');
  return result;
}
export function path(value: unknown, label = 'Path', allowRoot = true): string {
  const result = text(value, label);
  if (
    result.includes('\\') ||
    /[?#]/.test(result) ||
    result.split('/').some(p => p === '.' || p === '..') ||
    (!allowRoot && !result.replaceAll('/', ''))
  )
    throw invalid(
      `${label} must be an exact Media Library path without traversal or URL parameters.`
    );
  return result;
}
export function filename(value: unknown): string {
  const result = text(value, 'File name');
  if (/[\\/]/.test(result) || result === '.' || result === '..')
    throw invalid('File name must not contain a folder path.');
  return result;
}
export function ids(values: string[], max = 50) {
  if (!values.length || values.length > max || new Set(values).size !== values.length)
    throw invalid(`Supply 1–${max} distinct file IDs.`);
  values.forEach(id);
}
export function tags(values: string[], allowEmpty = false, commaDelimited = false) {
  if (!allowEmpty && !values.length) throw invalid('Supply at least one tag.');
  if (commaDelimited && values.join('').length > 500)
    throw invalid('Tags must contain at most 500 combined characters for this operation.');
  values.forEach(v => {
    text(v, 'Tag');
    if (commaDelimited && (v.includes('%') || v.includes(',')))
      throw invalid(
        'Comma-delimited tags must not contain percent signs or commas. Use the JSON tag update tools for an exact comma-bearing tag.'
      );
  });
}
export function url(value: unknown, httpsOnly = false): URL {
  const s = text(value, 'URL');
  let parsed: URL;
  try {
    parsed = new URL(s);
  } catch {
    throw invalid('Supply a complete HTTP or HTTPS URL.');
  }
  if (
    !(httpsOnly ? ['https:'] : ['http:', 'https:']).includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.hash
  )
    throw invalid('Supply a credential-free HTTP or HTTPS URL without a fragment.');
  return parsed;
}
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw invalid(
      'ImageKit returned an invalid response. Check the resource and account history before retrying a write.'
    );
  return result.data;
}

// Reject credential reflections in data and keys before any tool returns them.
export function safeData(value: unknown, key: string, depth = 0): unknown {
  if (depth > 32) throw invalid('ImageKit returned excessively nested data.');
  const secrets = [
    key,
    encodeURIComponent(key),
    Buffer.from(key).toString('base64'),
    Buffer.from(`${key}:`).toString('base64'),
    Buffer.from(`Basic ${Buffer.from(`${key}:`).toString('base64')}`).toString('base64')
  ];
  if (typeof value === 'string') {
    let decoded = value;
    for (let i = 0; i < 6; i++) {
      if (
        secrets.some(s => decoded.includes(s)) ||
        [...decoded.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g)].some(candidate => {
          const text = Buffer.from(candidate[0], 'base64').toString();
          return secrets.some(s => text.includes(s));
        })
      )
        throw invalid(
          'ImageKit returned credential-bearing data. Contact your account administrator.'
        );
      const next = decoded.replace(/(?:%[0-9a-f]{2})+/gi, p =>
        Buffer.from(p.replaceAll('%', ''), 'hex').toString()
      );
      if (next === decoded) break;
      decoded = next;
    }
    return value;
  }
  if (
    typeof value === 'number' &&
    (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))
  )
    throw invalid('ImageKit returned an inexact numeric value.');
  if (Array.isArray(value)) return value.map(v => safeData(v, key, depth + 1));
  if (isApiErrorRecord(value))
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => {
        safeData(k, key, depth + 1);
        return [k, safeData(v, key, depth + 1)];
      })
    );
  if (value === null || ['number', 'boolean', 'undefined'].includes(typeof value))
    return value;
  throw invalid('ImageKit returned invalid JSON data.');
}

export function upstream(error: unknown, operation: string, primary = false) {
  if (!primary && error instanceof ServiceError) return error;
  let status = getApiErrorStatus(error);
  const data =
    isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : undefined;
  const baggage = data && isApiErrorRecord(data.baggage) ? data.baggage : undefined;
  const mapped =
    baggage && isApiErrorRecord(baggage.serviceErrorData)
      ? baggage.serviceErrorData.upstreamStatus
      : undefined;
  if (typeof mapped === 'number' && mapped >= 100 && mapped <= 599) status = mapped;
  const message =
    status === 401
      ? 'ImageKit authentication failed. Reconnect with a valid private API key.'
      : status === 403
        ? 'ImageKit denied access. Check this private key’s media permissions and the feature’s plan availability.'
        : status === 404
          ? 'ImageKit could not find the resource. Use its exact ID or path and check the connected account.'
          : status === 429
            ? 'ImageKit rate-limited the request. Wait before retrying.'
            : 'ImageKit could not complete the request. Check account history before retrying an ambiguous write; no automatic retry was attempted.';
  return buildApiServiceError(
    { response: status === undefined ? {} : { status } },
    {
      providerLabel: 'ImageKit',
      operation,
      reason: 'imagekit_upstream',
      formatMessage: () => message,
      parent: {}
    }
  );
}
