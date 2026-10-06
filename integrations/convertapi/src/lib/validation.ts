import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';
import type { FileSource } from './types';

export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'convertapi_validation', parent: {} });
export function text(value: unknown, label: string): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  )
    throw invalid(`${label} must be a nonempty string without control characters.`);
  try {
    encodeURIComponent(value);
  } catch {
    throw invalid(`${label} must contain valid Unicode.`);
  }
  return value;
}
export function format(value: string): string {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(text(value, 'Format')))
    throw invalid(
      'Use a lowercase format or converter name returned by list_supported_conversions.'
    );
  return value;
}
export function resourceId(value: unknown, job = false): string {
  const id = text(value, job ? 'Job ID' : 'File ID');
  if (!(job ? /^[a-z0-9]{32}$/ : /^[a-zA-Z0-9_-]+$/).test(id))
    throw invalid('Use the exact opaque ID returned by ConvertAPI, without a URL or path.');
  return id;
}
export function remoteUrl(value: string): string {
  text(value, 'File URL');
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw invalid('File URL must be an absolute HTTP or HTTPS URL.');
  }
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.hash
  )
    throw invalid(
      'File URL must use HTTP or HTTPS and contain no embedded credentials or fragment.'
    );
  return value;
}
export function filename(value: unknown): string {
  const name = text(value, 'File name');
  if (name.includes('/') || name.includes('\\') || name === '.' || name === '..')
    throw invalid('File name must be a single name without a directory path.');
  return name;
}
export function base64(value: string, allowEmpty = false): Buffer {
  if (allowEmpty && value === '') return Buffer.alloc(0);
  if (
    !value ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
  )
    throw invalid(
      'File content must be nonempty, canonical base64 without a data URL prefix.'
    );
  const bytes = Buffer.from(value, 'base64');
  if (bytes.toString('base64') !== value)
    throw invalid('File content is not canonical base64.');
  return bytes;
}
export const fileSourceSchema = z
  .object({
    url: z.string().optional().describe('Public HTTP or HTTPS URL of the source file'),
    fileId: z.string().optional().describe('Exact ID of an unexpired ConvertAPI file'),
    base64Data: z
      .string()
      .optional()
      .describe('Canonical base64 file content, without a data URL prefix'),
    fileName: z.string().optional().describe('File name required with base64Data')
  })
  .describe('Provide exactly one of url, fileId, or base64Data with fileName.');
export function buildFileSource(file: z.infer<typeof fileSourceSchema>): FileSource {
  if ([file.url, file.fileId, file.base64Data].filter(v => v !== undefined).length !== 1)
    throw invalid('Provide exactly one of url, fileId, or base64Data with fileName.');
  if (file.base64Data !== undefined) {
    base64(file.base64Data);
    return { type: 'base64', fileName: filename(file.fileName), data: file.base64Data };
  }
  if (file.url !== undefined) return { type: 'url', url: remoteUrl(file.url) };
  return { type: 'fileId', fileId: resourceId(file.fileId) };
}
export function number(value: unknown, label: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    (Number.isInteger(value) && !Number.isSafeInteger(value))
  )
    throw invalid(
      `ConvertAPI returned an invalid ${label}. Contact provider support; conversions may already have consumed credits.`
    );
  return value;
}
export function record(value: unknown): Record<string, unknown> {
  if (!isApiErrorRecord(value))
    throw invalid(
      'ConvertAPI returned an unexpected response. Check service availability; reconcile any conversion before retrying.'
    );
  return value;
}
export function guardSecrets(value: unknown, secrets: string[], depth = 0): void {
  if (depth > 32) throw invalid('ConvertAPI returned excessively nested data.');
  if (typeof value === 'string') {
    const variants = secrets
      .filter(Boolean)
      .flatMap(s => [
        s,
        encodeURIComponent(s),
        Buffer.from(s).toString('base64'),
        Buffer.from(s).toString('base64url')
      ]);
    const redactor = new AuthConfigSecretRedactor(
      Object.fromEntries(secrets.map((s, i) => [`secret${i}`, s]))
    );
    let decoded = value;
    for (let n = 0; n <= 3; n++) {
      if (
        redactor.redactEmbedded(decoded) !== decoded ||
        variants.some(s => decoded.includes(s))
      )
        throw invalid(
          'ConvertAPI returned authentication credentials in ordinary data. Reconnect and contact provider support.'
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
  } else if (Array.isArray(value)) {
    for (const item of value) guardSecrets(item, secrets, depth + 1);
  } else if (isApiErrorRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      guardSecrets(key, secrets, depth + 1);
      guardSecrets(item, secrets, depth + 1);
    }
  }
}
export function upstream(error: unknown, operation: string) {
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
      ? 'ConvertAPI authentication failed. Reconnect with a valid API token or JWT; account information requires a Master Token.'
      : status === 403
        ? 'ConvertAPI denied the request. Check available conversion credits and credential permissions.'
        : status === 404
          ? 'The ConvertAPI resource is missing or expired. Use the exact ID or a supported converter.'
          : status === 429 || status === 503
            ? 'ConvertAPI rate-limited the request. Wait before retrying; reconcile a submitted conversion first.'
            : 'The ConvertAPI request failed. Check documented parameters and service availability. A submitted conversion may have consumed credits; reconcile it before retrying.';
  return buildApiServiceError(
    { response: status === undefined ? {} : { status } },
    {
      providerLabel: 'ConvertAPI',
      reason: 'convertapi_api_error',
      operation,
      extractMessage: () => message,
      extractResponse: () => (status === undefined ? {} : { status }),
      parent: {}
    }
  );
}
export function stringInteger(value: string, name: string, min: number, max: number): string {
  if (
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < min ||
    Number(value) > max
  )
    throw invalid(`${name} must be an integer string from ${min} to ${max}.`);
  return value;
}
