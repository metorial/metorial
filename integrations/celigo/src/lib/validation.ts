import { AuthConfigSecretRedactor, createApiServiceError } from 'slates';
import { z } from 'zod';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Document = { [key: string]: Json };
export const regions = z.enum(['us', 'eu', 'au', 'ca']);
export const hosts = {
  us: 'api.integrator.io',
  eu: 'api.eu.integrator.io',
  au: 'api.au.integrator.io',
  ca: 'api.ca.integrator.io'
} as const;
export type Region = keyof typeof hosts;
export const fail = (message: string, data: Record<string, unknown> = {}) => {
  const error = createApiServiceError(message, { parent: {} });
  Object.assign(error.data, data);
  return error;
};
export const own = (value: unknown, key: string): unknown =>
  value !== null && (typeof value === 'object' || typeof value === 'function')
    ? Object.getOwnPropertyDescriptor(value, key)?.value
    : undefined;
export const record = (value: unknown): Document => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw fail('Celigo returned an invalid object.');
  return value as Document;
};
export const id = (value: unknown, label = 'resource ID'): string => {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value))
    throw fail(`Provide a native 24-character hexadecimal ${label}.`);
  return value.toLowerCase();
};
export const string = (value: unknown, label = 'value'): string => {
  if (
    typeof value !== 'string' ||
    !value.length ||
    value.length > 4096 ||
    value === '.' ||
    value === '..' ||
    [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw fail(`Provide a nonempty ${label} without control characters.`);
  return value;
};
export const native = (value: unknown, expected?: string): Document => {
  const doc = record(value);
  const actual = id(doc._id, 'returned resource ID');
  if (expected !== undefined && actual !== id(expected))
    throw fail('Celigo returned a different resource. No further operation was performed.');
  return doc;
};
export const optionalString = (value: Json | undefined) =>
  typeof value === 'string' ? value : undefined;
export const optionalNumber = (value: Json | undefined) =>
  typeof value === 'number' && Number.isSafeInteger(value) ? value : undefined;
export const token = (value: unknown) => {
  const result = string(value, 'API token');
  if (/\s/.test(result))
    throw fail('Reconnect with a valid Celigo API token without whitespace.');
  return result;
};
export const regionFor = (
  auth: { region?: unknown },
  config?: { region?: unknown }
): Region => {
  const selected = auth.region === undefined ? undefined : regions.safeParse(auth.region);
  const legacy = config?.region === undefined ? undefined : regions.safeParse(config.region);
  if ((selected && !selected.success) || (legacy && !legacy.success))
    throw fail('Select the region where the Celigo token was issued.');
  const current = selected?.success ? selected.data : undefined;
  const previous = legacy?.success ? legacy.data : undefined;
  if (current && previous && current !== previous)
    throw fail(
      'The auth region conflicts with the stored region. Reconnect with the matching region or correct the stored configuration before sending a token.'
    );
  return current ?? previous ?? 'us';
};
export const clean = (
  value: unknown,
  secrets: readonly string[] = [],
  depth = 0,
  seen = new WeakSet<object>()
): Json => {
  if (depth > 30) throw fail('Celigo returned excessively nested data.');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))
      throw fail('Celigo returned a number that cannot be represented exactly.');
    return value;
  }
  if (typeof value === 'string') {
    const variants = secrets.flatMap(secret => [
      secret,
      Buffer.from(secret).toString('base64'),
      Buffer.from(secret).toString('base64url')
    ]);
    const redactor = new AuthConfigSecretRedactor({ secrets: variants });
    let pending = [value];
    const inspected = new Set<string>();
    for (let i = 0; i <= 5; i++) {
      const next: string[] = [];
      for (const decoded of pending) {
        if (inspected.has(decoded)) continue;
        inspected.add(decoded);
        if (redactor.redactEmbedded(decoded) !== decoded)
          throw fail('Celigo returned credential-bearing data. The response was withheld.');
        const text = decoded.replace(/(?:%[a-f\d]{2})+/gi, run => {
          try {
            return decodeURIComponent(run);
          } catch {
            return run;
          }
        });
        if (text !== decoded) next.push(text);
        if (/^[a-zA-Z\d+/_=-]{16,}$/.test(decoded))
          next.push(Buffer.from(decoded, 'base64').toString('utf8'));
      }
      pending = next;
    }
    return value;
  }
  if (
    !value ||
    typeof value !== 'object' ||
    seen.has(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype && !Array.isArray(value))
  )
    throw fail('Celigo returned unsupported data.');
  seen.add(value);
  let result: Json;
  if (Array.isArray(value))
    result = value.map(entry => clean(entry, secrets, depth + 1, seen));
  else {
    const doc: Document = {};
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (!('value' in descriptor)) throw fail('Celigo returned an invalid data property.');
      if (['__proto__', 'constructor', 'prototype'].includes(key))
        throw fail('Celigo returned an unsafe data property.');
      if (descriptor.value === undefined) continue;
      clean(key, secrets, depth + 1, seen);
      doc[key] =
        /password|secret|credential|authorization|access.?token|refresh.?token|private.?key|api.?key/i.test(
          key
        )
          ? '[redacted]'
          : clean(descriptor.value, secrets, depth + 1, seen);
    }
    result = doc;
  }
  seen.delete(value);
  return result;
};
export const requestDocument = (value: unknown, label: string): Document => {
  const doc = record(value);
  if (!Object.keys(doc).length) throw fail(`Provide a nonempty ${label}.`);
  // Request credentials must reach their destination; validate JSON without response redaction.
  const inspect = (v: unknown, depth = 0): void => {
    if (depth > 30) throw fail('The request is excessively nested.');
    if (v === null || typeof v === 'boolean' || typeof v === 'string') return;
    if (
      typeof v === 'number' &&
      Number.isFinite(v) &&
      (!Number.isInteger(v) || Number.isSafeInteger(v))
    )
      return;
    if (
      !v ||
      typeof v !== 'object' ||
      (Object.getPrototypeOf(v) !== Object.prototype && !Array.isArray(v))
    )
      throw fail('Provide finite JSON data.');
    for (const [key, d] of Object.entries(Object.getOwnPropertyDescriptors(v))) {
      if (['__proto__', 'constructor', 'prototype'].includes(key) || !('value' in d))
        throw fail('Provide ordinary JSON data properties.');
      inspect(d.value, depth + 1);
    }
  };
  inspect(doc);
  return doc;
};
export const queryFields = (data: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, string(v, k)])
  );

export { z };
