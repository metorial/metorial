import { buildApiServiceError, createApiServiceError } from 'slates';
import { z } from 'zod';
import type { HoneybadgerRegion } from './types';

export const projectIdSchema = z
  .string()
  .describe('Project ID. Call list_projects to discover accessible projects.');
export const accountIdSchema = z
  .string()
  .describe('Account ID. Call list_accounts to discover authorized accounts.');
export const nextUrlSchema = z
  .string()
  .optional()
  .describe(
    'Next-page URL from the preceding response. Other filters are retained from that URL.'
  );
export function hosts(region?: HoneybadgerRegion) {
  return {
    data: `https://${region === 'eu' ? 'eu-app' : 'app'}.honeybadger.io/v2`,
    reporting: `https://${region === 'eu' ? 'eu-api' : 'api'}.honeybadger.io/v1`
  };
}
export function pathId(value: string, label = 'ID') {
  if (
    !value.trim() ||
    value !== value.trim() ||
    value === '.' ||
    value === '..' ||
    /[/\\]/.test(value) ||
    Array.from(value).some(
      character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    )
  )
    throw createApiServiceError(
      `${label} must be a nonempty provider ID without path separators, whitespace padding, or dot segments.`
    );
  return encodeURIComponent(value);
}
export function validateLimit(value?: number) {
  if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > 25))
    throw createApiServiceError('limit must be an integer from 1 to 25.');
}
export function requireUpdate(...values: unknown[]) {
  if (values.every(value => value === undefined))
    throw createApiServiceError('Provide at least one field to update.');
}
export function honeybadgerError(error: unknown) {
  return buildApiServiceError(error, {
    parent: {},
    providerLabel: 'Honeybadger',
    reason: 'honeybadger_api_error',
    formatMessage: ({ status }) => {
      if (status === 429)
        return 'Honeybadger rate limit reached. Wait for the quota to reset before retrying.';
      if (status === 403)
        return 'Honeybadger rejected this request (HTTP 403). Check credentials, region and permissions; the Data API also uses 403 when its hourly request quota is exhausted.';
      return `Honeybadger request failed${status ? ` (HTTP ${status})` : ''}. Check credentials, region, resource IDs and request fields.`;
    }
  });
}
export function pageUrl(base: string, endpoint: string, nextUrl?: string | null) {
  if (!nextUrl) return undefined;
  let url: URL;
  try {
    url = new URL(nextUrl, base);
  } catch {
    throw createApiServiceError(
      'Invalid next-page URL. Use the URL returned by the preceding list request.'
    );
  }
  const origin = new URL(base).origin;
  if (
    url.origin !== origin ||
    url.pathname.replace(/\/$/, '') !== `/v2${endpoint}`.replace(/\/$/, '') ||
    url.username ||
    url.password ||
    url.hash
  )
    throw createApiServiceError(
      'The next-page URL must address the same Honeybadger list endpoint and region.'
    );
  return url.toString();
}
