import { ServiceError } from '@lowerdeck/error';
import { createApiServiceError, getApiErrorStatus } from 'slates';
import { z } from 'zod';

export { z };
export type Params = Record<string, string | number | boolean>;
export function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw createApiServiceError(message, { reason: 'serpapi_validation' });
}
export function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
export function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
export function string(value: unknown, name: string, max = 8192): string {
  requireValue(
    typeof value === 'string' &&
      value.trim().length > 0 &&
      value.length <= max &&
      !Array.from(value).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127),
    `${name} must be nonempty text without control characters, at most ${max} characters.`
  );
  return value;
}
export function integer(value: unknown, name: string, min = 0, max = 1000000): number {
  requireValue(
    typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max,
    `${name} must be an integer from ${min} to ${max}.`
  );
  return value;
}
export function apiKey(value: unknown): string {
  const key = string(value, 'API key', 512);
  requireValue(
    Array.from(key).every(c => c.charCodeAt(0) >= 33 && c.charCodeAt(0) <= 126),
    'API key must contain printable ASCII without whitespace.'
  );
  return key;
}
export function searchId(value: unknown): string {
  const id = string(value, 'Search ID', 256);
  requireValue(
    /^[A-Za-z0-9_-]+$/.test(id),
    'Search ID must be the exact native opaque ID, without URL or path characters.'
  );
  return id;
}
export function safeJson(value: unknown, key: string): void {
  const variants = [
    key,
    encodeURIComponent(key),
    Buffer.from(key).toString('base64'),
    Buffer.from(key).toString('base64url'),
    Buffer.from(key).toString('hex')
  ];
  let nodes = 0;
  let inspections = 0;
  const inspect = (candidate: string, depth = 0) => {
    requireValue(++inspections <= 100000, 'SerpApi encoded text exceeds bounded structure.');
    requireValue(
      !variants.some(secret => secret && candidate.includes(secret)),
      'SerpApi response reflected a credential; no result was delivered.'
    );
    if (depth >= 3) return;
    let decoded = candidate.replace(/\\u([0-9a-f]{4})/gi, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    );
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      /* A literal percent is valid provider text. */
    }
    if (decoded !== candidate) inspect(decoded, depth + 1);
    for (const part of candidate.match(/[A-Za-z0-9+/_-]{16,}={0,2}/g) ?? []) {
      const bytes = Buffer.from(part, 'base64');
      if (
        bytes.toString('base64url') ===
        part.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
      ) {
        const text = bytes.toString('utf8');
        if (text !== part) inspect(text, depth + 1);
      }
    }
  };
  const visit = (v: unknown, depth: number) => {
    requireValue(
      ++nodes <= 100000 && depth <= 40,
      'SerpApi response exceeds bounded structure.'
    );
    if (typeof v === 'string') {
      inspect(v);
    } else if (typeof v === 'number') {
      requireValue(
        Number.isFinite(v) && (!Number.isInteger(v) || Number.isSafeInteger(v)),
        'SerpApi returned a nonfinite or imprecise numeric value.'
      );
    } else if (Array.isArray(v)) {
      v.forEach(item => visit(item, depth + 1));
    } else if (v && typeof v === 'object') {
      requireValue(
        Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null,
        'SerpApi returned a non-JSON object.'
      );
      for (const [name, item] of Object.entries(v)) {
        visit(name, depth + 1);
        visit(item, depth + 1);
      }
    } else
      requireValue(
        v === null || v === undefined || typeof v === 'boolean',
        'SerpApi returned a non-JSON value.'
      );
  };
  visit(value, 0);
  requireValue(
    Buffer.byteLength(JSON.stringify(value) ?? '') <= 8 * 1024 * 1024,
    'SerpApi response exceeds 8 MiB.'
  );
}
export function upstream(error: unknown, operation: string) {
  if (error instanceof ServiceError) return error;
  const status = getApiErrorStatus(error);
  return createApiServiceError(
    `SerpApi ${operation} failed${typeof status === 'number' && Number.isSafeInteger(status) ? ` (HTTP ${status})` : ''}. Verify the API key, quota, native parameters and account permissions. The request may have consumed search credits; do not blindly retry.`,
    {
      reason: 'serpapi_upstream',
      upstreamStatus:
        typeof status === 'number' && Number.isSafeInteger(status) ? status : undefined
    }
  );
}
export const searchMetadataSchema = z.object({
  searchId: z.string().optional(),
  status: z.string().optional(),
  totalResults: z.number().optional(),
  timeTaken: z.number().optional()
});
// Native result shapes vary by engine; validate collections before legacy projections.
export function validateCollections(value: unknown): void {
  const collections = new Set([
    'organic_results',
    'images_results',
    'visual_matches',
    'suggested_searches',
    'news_results',
    'menu_links',
    'stories',
    'video_results',
    'movie_results',
    'shopping_results',
    'products',
    'local_results',
    'best_flights',
    'other_flights',
    'flights',
    'layovers',
    'articles',
    'resources',
    'interests',
    'timeline_data',
    'compared_breakdown_by_region',
    'interest_by_region',
    'rising',
    'top',
    'trending_searches',
    'daily_search_trends',
    'jobs_results',
    'chips',
    'suggestions',
    'related_searches',
    'related_questions'
  ]);
  const visit = (v: unknown, parent = '') => {
    if (Array.isArray(v)) {
      v.forEach(item => visit(item, parent));
      return;
    }
    if (!v || typeof v !== 'object') return;
    for (const [key, item] of Object.entries(v)) {
      if (
        (collections.has(key) ||
          (key === 'authors' && parent === 'publication_info') ||
          (key === 'options' && parent === 'chips') ||
          (key === 'values' &&
            ['timeline_data', 'compared_breakdown_by_region', 'interest_by_region'].includes(
              parent
            ))) &&
        item !== undefined &&
        item !== null
      ) {
        requireValue(Array.isArray(item), `SerpApi returned an invalid ${key} collection.`);
        requireValue(
          item.every(row => row && typeof row === 'object' && !Array.isArray(row)),
          `SerpApi returned an invalid ${key} item.`
        );
      }
      visit(item, key);
    }
  };
  visit(value);
}
