import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
import type { z } from 'zod';

export const invalid = (message: string, data?: Record<string, unknown>) =>
  createApiServiceError(message, { reason: 'documenso_validation', ...data });
export function text(value: unknown, label: string, allowEmpty = false) {
  if (
    typeof value !== 'string' ||
    (!allowEmpty && !value.trim()) ||
    [...value].some(c => c.charCodeAt(0) < 32 && c !== '\n' && c !== '\t')
  )
    throw invalid(`${label} must be valid text${allowEmpty ? '' : ' and nonempty'}.`);
  return value;
}
export function id(value: unknown) {
  const result = text(value, 'Resource ID');
  if (!/^[A-Za-z0-9_-]+$/.test(result))
    throw invalid('Use the exact Documenso resource ID, without a path or URL.');
  return result;
}
export function numericId(value: unknown) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
    throw invalid('Recipient and field IDs must be positive safe integers from get_envelope.');
  return value;
}
export function token(value: unknown) {
  const result = text(value, 'API token');
  if (!result.startsWith('api_') || result.length <= 4 || /\s/.test(result))
    throw invalid('Reconnect with a valid Documenso API token including its api_ prefix.');
  return result;
}
export function baseUrl(value: unknown = 'https://app.documenso.com/api/v2') {
  let parsed: URL;
  try {
    parsed = new URL(text(value, 'API base URL'));
  } catch {
    throw invalid('Use the full HTTPS Documenso API base URL ending in /api/v2.');
  }
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    !hostname.includes('.') ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    /^(?:\d+\.){3}\d+$/.test(hostname) ||
    parsed.hostname.includes(':') ||
    !parsed.pathname.replace(/\/$/, '').endsWith('/api/v2')
  )
    throw invalid(
      'Use a public HTTPS Documenso cloud or self-hosted API base URL ending in /api/v2, without credentials, query, or fragment. Reconnect to change instances.'
    );
  return parsed.href.replace(/\/$/, '');
}
export function clientConfig(ctx: {
  auth: { token: string; baseUrl?: string };
  config?: { baseUrl?: unknown };
}) {
  return { token: ctx.auth.token, baseUrl: baseUrl(ctx.auth.baseUrl ?? ctx.config?.baseUrl) };
}
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw invalid(
      'Documenso returned an invalid response. Inspect the envelope and retained audit history before retrying a write.'
    );
  return result.data;
}
export function paging(page?: number, perPage?: number) {
  if (
    (page !== undefined && (!Number.isSafeInteger(page) || page < 1)) ||
    (perPage !== undefined && (!Number.isSafeInteger(perPage) || perPage < 1 || perPage > 100))
  )
    throw invalid('page must be a positive safe integer; perPage must be 1–100.');
}
export function email(value: unknown, allowEmpty = false) {
  const result = text(value, 'Recipient email', allowEmpty);
  if (result.length > 254 || (result !== '' && !/^[^\s@]+@[^\s@]+$/.test(result)))
    throw invalid(
      'Supply a valid recipient email address; only template placeholders may use an empty email.'
    );
  return result;
}
export function safeData(value: unknown, key: string, depth = 0): unknown {
  if (depth > 32) throw invalid('Documenso returned excessively nested data.');
  if (typeof value === 'string') {
    const secrets = [key, encodeURIComponent(key), Buffer.from(key).toString('base64')];
    let decoded = value;
    for (let i = 0; i < 6; i++) {
      if (secrets.some(s => decoded.includes(s)))
        throw invalid(
          'Documenso returned credential-bearing data. Contact your instance administrator.'
        );
      for (const candidate of decoded.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g))
        if (Buffer.from(candidate[0], 'base64').toString().includes(key))
          throw invalid(
            'Documenso returned credential-bearing data. Contact your instance administrator.'
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
    throw invalid('Documenso returned an inexact numeric value.');
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
  throw invalid('Documenso returned invalid JSON data.');
}
export function upstream(error: unknown, operation: string, primary = false) {
  if (!primary && error instanceof ServiceError) return error;
  const candidate = getApiErrorStatus(error);
  const normalized =
    typeof candidate === 'string' && /^[1-5]\d{2}$/.test(candidate)
      ? Number(candidate)
      : candidate;
  let status: number | undefined =
    typeof normalized === 'number' &&
    Number.isInteger(normalized) &&
    normalized >= 100 &&
    normalized <= 599
      ? normalized
      : undefined;
  const data =
    isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : undefined;
  if (
    typeof data?.upstreamStatus === 'number' &&
    Number.isInteger(data.upstreamStatus) &&
    data.upstreamStatus >= 100 &&
    data.upstreamStatus <= 599
  )
    status = data.upstreamStatus;
  const baggage = data && isApiErrorRecord(data.baggage) ? data.baggage : undefined;
  const mapped =
    baggage && isApiErrorRecord(baggage.serviceErrorData)
      ? baggage.serviceErrorData.upstreamStatus
      : undefined;
  if (typeof mapped === 'number' && Number.isInteger(mapped) && mapped >= 100 && mapped <= 599)
    status = mapped;
  const message =
    status === 401
      ? 'Documenso authentication or permission failed. Reconnect with the API token for the correct instance and team.'
      : status === 403
        ? 'Documenso denied access. Check API-token team access, envelope permissions, and feature availability.'
        : status === 404
          ? 'Documenso could not find this resource in the connected instance and team. Use its exact ID.'
          : status === 429
            ? 'Documenso rate-limited the request. Wait before retrying.'
            : 'Documenso could not complete the request. Inspect the envelope and audit history before retrying an ambiguous write or send; no automatic retry was attempted.';
  return buildApiServiceError(
    { response: status === undefined ? {} : { status } },
    {
      providerLabel: 'Documenso',
      operation,
      reason: 'documenso_upstream',
      formatMessage: () => message,
      parent: {}
    }
  );
}
