import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
import type { ConvertOptions, ResizeOptions, StoreOptions } from './client';

export const FILE_LIMIT = 64 * 1024 * 1024;
export const imageTypes = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/avif',
  'image/jxl'
];
export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'tinypng_validation', parent: {} });
export function text(value: unknown, label: string): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  )
    throw invalid(`${label} must be nonempty and contain no control characters.`);
  return value;
}
export function sourceUrl(value: string): string {
  text(value, 'Source URL');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw invalid('Source URL must be an absolute HTTP or HTTPS URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash)
    throw invalid(
      'Source URL must use HTTP or HTTPS without embedded credentials or a fragment.'
    );
  return value;
}
export function outputUrl(value: unknown): string {
  const input = text(value, 'Provider image URL');
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw invalid(
      'Tinify returned an invalid image URL; reconcile the compression before retrying.'
    );
  }
  if (
    url.origin !== 'https://api.tinify.com' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/output\/[a-zA-Z0-9_-]+$/.test(url.pathname)
  )
    throw invalid(
      'Tinify returned an unexpected image URL; credentials will not be forwarded.'
    );
  return url.href;
}
export function integer(value: unknown, label: string, positive = false): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (positive ? 1 : 0))
    throw invalid(`${label} must be a ${positive ? 'positive' : 'nonnegative'} safe integer.`);
  return value;
}
export function validateOptions(options: {
  resize?: ResizeOptions;
  convert?: ConvertOptions;
  preserve?: string[];
  background?: string;
  store?: StoreOptions;
}) {
  if (options.resize) {
    const r = options.resize;
    if (!['scale', 'fit', 'cover', 'thumb'].includes(r.method))
      throw invalid('Choose scale, fit, cover or thumb.');
    if (r.width !== undefined) integer(r.width, 'Width', true);
    if (r.height !== undefined) integer(r.height, 'Height', true);
    if (
      r.method === 'scale'
        ? (r.width === undefined) === (r.height === undefined)
        : r.width === undefined || r.height === undefined
    )
      throw invalid(
        'Scale requires exactly one dimension; fit, cover and thumb require both width and height.'
      );
  }
  if (options.convert) {
    const types = Array.isArray(options.convert.type)
      ? options.convert.type
      : [options.convert.type];
    if (
      !types.length ||
      types.some(
        t =>
          !imageTypes.includes(t) &&
          !(types.length === 1 && t === '*/*' && !Array.isArray(options.convert?.type))
      )
    )
      throw invalid(
        'Use a supported image MIME type, a nonempty array of supported types, or the single wildcard */*.'
      );
  }
  const background = options.convert?.background ?? options.background;
  if (background !== undefined) {
    if (!options.convert) throw invalid('Background requires a target format in convertTo.');
    if (!/^(?:#[0-9a-fA-F]{6}|white|black)$/.test(background))
      throw invalid('Background must be a six-digit hex color, white or black.');
  }
  if (options.preserve?.some(p => !['copyright', 'creation', 'location'].includes(p)))
    throw invalid('Preserve supports copyright, creation and location.');
  if (options.store) {
    const s = options.store;
    const path = text(s.path, 'Storage path');
    if (!/^[^/]+\/[^/](?:.*[^/])?$/.test(path) || path.includes('\\'))
      throw invalid('Storage path must include a bucket and nonempty object key.');
    if (s.service === 's3') {
      text(s.awsAccessKeyId, 'AWS access key ID');
      text(s.awsSecretAccessKey, 'AWS secret key');
      text(s.region, 'AWS region');
      if (s.acl !== undefined) {
        text(s.acl, 'S3 ACL');
        if (
          ![
            'no-acl',
            'private',
            'public-read',
            'public-read-write',
            'aws-exec-read',
            'authenticated-read',
            'bucket-owner-read',
            'bucket-owner-full-control'
          ].includes(s.acl)
        )
          throw invalid(
            'S3 ACL must be an object canned ACL or no-acl. Use no-acl for a bucket that disables ACLs; check bucket permissions before submitting.'
          );
      }
    } else if (s.service === 'gcs') text(s.gcpAccessToken, 'GCP access token');
    else throw invalid('Choose s3 or gcs storage.');
    for (const [key, value] of Object.entries(s.headers ?? {})) {
      if (key !== 'Cache-Control')
        throw invalid('Only the documented Cache-Control storage header is supported.');
      text(value, 'Cache-Control');
    }
  }
}
export function guardSecrets(value: unknown, secrets: string[], depth = 0): void {
  if (depth > 32) throw invalid('Tinify returned excessively nested data.');
  if (typeof value === 'string') {
    const redactor = new AuthConfigSecretRedactor(
      Object.fromEntries(secrets.filter(Boolean).map((s, i) => [`secret${i}`, s]))
    );
    const variants = secrets
      .filter(Boolean)
      .flatMap(s => [
        s,
        Buffer.from(s).toString('base64'),
        Buffer.from(s).toString('base64url')
      ]);
    let decoded = value;
    for (let n = 0; n < 4; n++) {
      if (
        redactor.redactEmbedded(decoded) !== decoded ||
        variants.some(s => decoded.includes(s))
      )
        throw invalid(
          'Tinify returned credentials in ordinary data. Reconnect and contact provider support.'
        );
      try {
        const next = decodeURIComponent(decoded);
        if (next === decoded) break;
        decoded = next;
      } catch {
        const next = decoded.replace(/(?:%[0-9a-f]{2})+/gi, s =>
          Buffer.from(s.replace(/%/g, ''), 'hex').toString('utf8')
        );
        if (next === decoded) break;
        decoded = next;
      }
    }
  } else if (Array.isArray(value))
    for (const item of value) guardSecrets(item, secrets, depth + 1);
  else if (isApiErrorRecord(value))
    for (const [key, item] of Object.entries(value)) {
      guardSecrets(key, secrets, depth + 1);
      guardSecrets(item, secrets, depth + 1);
    }
}
export function upstream(error: unknown): never {
  const raw =
    getApiErrorStatus(error) ??
    (isApiErrorRecord(error) && isApiErrorRecord(error.data)
      ? error.data.upstreamStatus
      : undefined);
  const status =
    typeof raw === 'number' && Number.isInteger(raw) && raw >= 100 && raw <= 599
      ? raw
      : undefined;
  throw buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Tinify',
      reason: 'tinypng_upstream',
      parent: {},
      extractMessage: () =>
        status === 401
          ? 'Check the API key.'
          : status === 429
            ? 'Check the account quota or wait before retrying.'
            : status && status >= 500
              ? 'Check service availability before retrying.'
              : 'Check the source image and options. A submitted compression or cloud write may already have succeeded; reconcile usage and storage before retrying.'
    }
  );
}
