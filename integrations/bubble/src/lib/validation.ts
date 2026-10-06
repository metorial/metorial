import { isIP } from 'node:net';
import { createApiServiceError } from 'slates';
import { z } from 'zod';

export { z };
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Document = { [key: string]: Json };
export function fail(message: string, data: Record<string, unknown> = {}) {
  const error = createApiServiceError(message, {
    reason: 'bubble_request_failed',
    parent: {}
  });
  Object.assign(error.data, data);
  return error;
}
export function text(value: unknown, name: string) {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length > 2048 ||
    [...value].some(c => {
      const code = c.codePointAt(0) ?? 0;
      return code < 32 || code === 127 || (code >= 0xd800 && code <= 0xdfff);
    })
  )
    throw fail(`Provide a valid ${name}.`);
  return value;
}
export function appUrl(value: unknown) {
  const raw = text(value, 'Bubble API base URL');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw fail('Provide the HTTPS API URL from Bubble Settings → API, including /api/1.1.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    isIP(url.hostname) ||
    !url.hostname.includes('.') ||
    /(^|\.)(localhost|local)$/.test(url.hostname) ||
    !/^\/(?:[A-Za-z0-9_-]+\/)?api\/1\.1\/?$/.test(url.pathname) ||
    raw.includes('\\') ||
    raw.includes('%') ||
    raw.replace(/\/$/, '') !== `${url.origin}${url.pathname.replace(/\/$/, '')}`
  )
    throw fail(
      'Use the exact public HTTPS Bubble app API URL, optionally including its branch, ending in /api/1.1. Credentials, local addresses, query strings and fragments are not allowed.'
    );
  return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
}
export function segment(value: unknown, name: string) {
  const result = text(value, name);
  if (result === '.' || result === '..' || /[/\\%?#]/.test(result))
    throw fail(`Provide an exact ${name}, without URL delimiters.`);
  return result;
}
export function typeName(value: unknown) {
  return text(segment(value, 'data type').replace(/ /g, '').toLowerCase(), 'data type');
}
export function integer(value: unknown, name: string, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    throw fail(`${name} must be an integer from ${min} to ${max}.`);
  return value;
}
export function own(value: unknown, key: string): unknown {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function'))
    return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}
export function object(value: unknown): Document {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw fail('Bubble returned an unexpected object.');
  return value as Document;
}
export function reflected(value: string, secrets: string[], depth = 0): boolean {
  if (secrets.some(secret => secret && value.includes(secret))) return true;
  if (depth >= 3) return false;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded !== value && reflected(decoded, secrets, depth + 1)) return true;
  } catch {}
  for (const part of [value, ...(value.match(/[A-Za-z0-9_+/-]{12,}={0,2}/g) ?? [])]) {
    if (/^[A-Za-z0-9_+/-]+={0,2}$/.test(part)) {
      const decoded = Buffer.from(part, 'base64url').toString('utf8');
      if (decoded && decoded !== part && reflected(decoded, secrets, depth + 1)) return true;
    }
  }
  return false;
}
export function json(
  value: unknown,
  secrets: string[] = [],
  response = false,
  seen = new Set<object>(),
  depth = 0
): Json {
  if (depth > 30) throw fail('The JSON data is too deeply nested.');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (Buffer.byteLength(value) > 16 * 1024 * 1024)
      throw fail('JSON text exceeds the 16 MiB request/response bound.');
    if (reflected(value, secrets))
      throw fail('Bubble returned credential-bearing data. The response was withheld.');
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))
      throw fail(
        'Numeric data cannot be represented precisely. Use strings for large identifiers or integers.'
      );
    return value;
  }
  if (
    !value ||
    typeof value !== 'object' ||
    seen.has(value) ||
    (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
  )
    throw fail('Provide ordinary finite JSON data.');
  seen.add(value);
  const result: Json[] | Document = Array.isArray(value) ? [] : {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (Array.isArray(value) && key === 'length') continue;
    if (!('value' in descriptor) || ['__proto__', 'constructor', 'prototype'].includes(key))
      throw fail('Unsafe JSON keys or accessors are not supported.');
    if (reflected(key, secrets)) throw fail('Credential-bearing response keys were withheld.');
    const entry =
      response &&
      typeof descriptor.value === 'string' &&
      /^(password|secret|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|authorization|private[_ -]?key|token)$/i.test(
        key
      )
        ? '[redacted]'
        : json(descriptor.value, secrets, response, seen, depth + 1);
    if (Array.isArray(result)) result.push(entry);
    else result[key] = entry;
  }
  seen.delete(value);
  return result;
}
export function fields(value: unknown) {
  const result = object(json(value));
  if (['_id', 'Created Date', 'Modified Date'].some(key => key in result))
    throw fail('Unique ID, Created Date and Modified Date are provider-managed fields.');
  return result;
}
