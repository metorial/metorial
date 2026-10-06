import {
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';

export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'rippling_validation', parent: {} });
export function requirePartnerOAuth(
  auth: { authMethod?: string; refreshToken?: string },
  capability: string
): void {
  // Older partner connections did not persist authMethod but did persist their refresh token.
  if (auth.authMethod !== 'oauth' && (auth.authMethod === 'api_token' || !auth.refreshToken))
    throw invalid(
      `${capability} requires a v1 partner OAuth app connection with that feature enabled; customer API tokens are unsupported.`
    );
}
export function required(value: unknown, label: string): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    [...value].some(
      character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    )
  )
    throw invalid(`Provide a nonblank ${label} without control characters.`);
  return value.trim();
}
export function routeId(value: string): string {
  const id = required(value, 'resource identifier');
  if (id === '.' || id === '..') throw invalid('Provide a valid resource identifier.');
  return encodeURIComponent(id);
}
export function requireV1(value: unknown): void {
  if (value !== undefined && value !== 'platform_v1')
    throw invalid(
      'These tools use the Rippling v1 API. Select platform_v1 and connect credentials authorized for that API; v2 credentials and endpoints have different contracts.'
    );
}
export function paging(params?: { limit?: number; offset?: number }): void {
  if (
    params?.limit !== undefined &&
    (!Number.isSafeInteger(params.limit) || params.limit < 1 || params.limit > 100)
  )
    throw invalid('limit must be a whole number from 1 to 100.');
  if (
    params?.offset !== undefined &&
    (!Number.isSafeInteger(params.offset) || params.offset < 0)
  )
    throw invalid('offset must be a nonnegative safe whole number.');
}
export function date(value: string | undefined, label: string): void {
  if (value === undefined) return;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw invalid(`${label} must be a valid date in YYYY-MM-DD format.`);
}
export function response<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw createApiServiceError(
      'Rippling returned an unexpected response. Verify API version and granted access.',
      { reason: 'rippling_response', parent: {} }
    );
  return parsed.data;
}
export function exact<T extends { id: string }>(value: T, id: string): T {
  if (value.id !== id.trim())
    throw createApiServiceError('Rippling returned a different resource than requested.', {
      reason: 'rippling_response',
      parent: {}
    });
  return value;
}
export function safeResponse(value: unknown, secrets: string[]): unknown {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw createApiServiceError('Rippling returned an unreadable response.', {
      reason: 'rippling_response',
      parent: {}
    });
  }
  if (
    serialized !== undefined &&
    secrets.some(secret => secret && serialized.includes(secret))
  )
    throw createApiServiceError(
      'Rippling returned credential material instead of a usable response.',
      { reason: 'rippling_response', parent: {} }
    );
  return value;
}
export function apiStatus(error: unknown): number | undefined {
  const bounded = z.number().int().min(100).max(599);
  const direct = z.object({ data: z.object({ upstreamStatus: bounded }) }).safeParse(error);
  const protocol = z
    .object({
      data: z.object({
        baggage: z.object({ serviceErrorData: z.object({ upstreamStatus: bounded }) })
      })
    })
    .safeParse(error);
  const raw =
    (direct.success ? direct.data.data.upstreamStatus : undefined) ??
    (protocol.success
      ? protocol.data.data.baggage.serviceErrorData.upstreamStatus
      : undefined) ??
    getApiErrorStatus(error);
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 100 && raw <= 599
    ? raw
    : undefined;
}
export function apiFailure(error: unknown, mutation = false): never {
  const status = apiStatus(error);
  const retry = mutation
    ? ' Verify the current provider state before retrying; completion is not confirmed.'
    : '';
  const message =
    status === 401
      ? 'Reconnect the Rippling credentials.'
      : status === 403
        ? 'Verify the token scopes, app capabilities and account permissions.'
        : status === 404
          ? 'Verify the resource and app feature access; this does not prove a successful deletion.'
          : status === 409
            ? 'Read the current resource and concurrency token before trying again.'
            : status === 429
              ? 'Wait before retrying the request.'
              : 'Check Rippling availability and request parameters.';
  // Do not pass transport errors or existing ServiceErrors to the builder: they retain raw parents.
  throw buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Rippling',
      operation: mutation ? 'change' : 'request',
      extractMessage: () => message + retry,
      extractStatus: () => status,
      parent: {},
      reason: 'rippling_api'
    }
  );
}
export function record(value: unknown): Record<string, unknown> {
  if (!isApiErrorRecord(value)) throw invalid('Provide an object.');
  return value;
}
