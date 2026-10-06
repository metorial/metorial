import { createApiServiceError } from 'slates';
import type { z } from 'zod';
export function invalid(message: string): never {
  throw createApiServiceError(message, { reason: 'invalid_input' });
}
export function malformed(): never {
  throw createApiServiceError(
    'Workato returned an unexpected response. Verify the resource and API client privileges; after an uncertain write, read back the resource before retrying.',
    { reason: 'invalid_provider_response' }
  );
}
export const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return malformed();
  return value as Record<string, unknown>;
};
export const records = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) return malformed();
  return value.map(object);
};
export const native = <T>(value: unknown, schema: z.ZodType<T>): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return malformed();
  return parsed.data;
};
export const field = <T>(row: Record<string, unknown>, key: string, schema: z.ZodType<T>) =>
  native(row[key], schema);
export const idNumber = (value: unknown): number => {
  const number = typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < 1)
    return malformed();
  return number;
};
export const numericId = (value: unknown, label: string): string => {
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    !/^[1-9]\d*$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value))
  )
    return invalid(
      `${label} must be a positive, safe integer ID. Discover it with the corresponding list tool.`
    );
  return String(value);
};
export const pathId = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(value))
    return invalid(`${label} must be a single native resource identifier.`);
  return encodeURIComponent(value);
};
export const required = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim())
    return invalid(`${label} is required for this action.`);
  return value;
};
export const pageSize = (value: number | undefined, maximum: number, label: string) => {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < 1 || value > maximum))
    invalid(`${label} must be an integer from 1 to ${maximum}.`);
  return value;
};
export const timestamp = (value: string | undefined) => {
  if (
    value !== undefined &&
    (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
      !Number.isFinite(Date.parse(value)))
  )
    invalid('Provide an ISO 8601 timestamp with a time zone.');
  return value;
};
export const nonemptyObject = (value: unknown, label: string) => {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length === 0
  )
    invalid(`${label} must contain at least one entry.`);
};
export const jsonString = (value: string | undefined, label: string) => {
  if (value === undefined) return;
  try {
    JSON.parse(value);
  } catch {
    invalid(`${label} must be a valid JSON string.`);
  }
};
export const success = (value: unknown, stringTrue = false) => {
  const result = object(value);
  if (result.success !== true && !(stringTrue && result.success === 'true')) malformed();
  return result;
};
export const dataSuccess = (value: unknown) => {
  const result = object(object(value).data);
  if (result.status !== 'success') malformed();
  return result;
};
export const credentialVariants = (value: unknown): string[] => {
  const token = required(value, 'API client token');
  if ([...token].some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127))
    invalid('API client token must not contain whitespace or control characters.');
  let encoded: string;
  try {
    encoded = encodeURIComponent(token);
  } catch {
    return invalid('API client token must contain well-formed Unicode characters.');
  }
  return [
    token,
    encoded,
    Buffer.from(token).toString('base64'),
    Buffer.from(token).toString('base64url')
  ];
};
const checkSecretText = (text: string, secrets: readonly string[]): void => {
  if (!secrets.length) return;
  const candidates = [{ text, depth: 0 }];
  const seen = new Set<string>();
  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index];
    if (!candidate || seen.has(candidate.text)) continue;
    seen.add(candidate.text);
    if (secrets.some(secret => secret && candidate.text.includes(secret))) malformed();
    if (candidate.depth >= 3) continue;
    const add = (decoded: string) => {
      if (decoded !== candidate.text && !seen.has(decoded)) {
        if (candidates.length >= 32) malformed();
        candidates.push({ text: decoded, depth: candidate.depth + 1 });
      }
    };
    try {
      add(decodeURIComponent(candidate.text));
    } catch {
      // Literal percent characters are valid provider text.
    }
    for (const match of candidate.text.matchAll(/[A-Za-z0-9+/_-]{12,}={0,2}/g)) {
      const bytes = Buffer.from(match[0], 'base64');
      const decoded = bytes.toString('utf8');
      const normalized = match[0].replaceAll('-', '+').replaceAll('_', '/').replace(/=+$/, '');
      if (
        bytes.toString('base64').replace(/=+$/, '') === normalized &&
        Buffer.from(decoded).equals(bytes)
      )
        add(decoded);
    }
  }
};
// Read descriptors, not accessors, before projecting provider data or diagnostic graphs.
export const safeJson = (
  value: unknown,
  secrets: readonly string[] = [],
  maximumBytes = 16 * 1024 * 1024
): void => {
  let count = 0;
  const seen = new Set<object>();
  const walk = (entry: unknown, depth: number): void => {
    if (depth > 40 || ++count > 100000) malformed();
    if (typeof entry === 'string') {
      checkSecretText(entry, secrets);
      return;
    }
    if (typeof entry === 'number') {
      if (!Number.isFinite(entry) || (Number.isInteger(entry) && !Number.isSafeInteger(entry)))
        malformed();
      return;
    }
    if (entry === undefined || entry === null || typeof entry === 'boolean') return;
    if (typeof entry !== 'object' || seen.has(entry)) malformed();
    seen.add(entry);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(entry))) {
      if (!('value' in descriptor)) malformed();
      walk(key, depth + 1);
      walk(descriptor.value, depth + 1);
    }
    seen.delete(entry);
  };
  walk(value, 0);
  const serialized = JSON.stringify(value);
  if (serialized !== undefined && Buffer.byteLength(serialized) > maximumBytes) malformed();
};
