import { createApiServiceError, pickDefined } from 'slates';

export function invalid(message: string): never {
  throw createApiServiceError(message, { reason: 'dialpad_invalid_input', parent: {} });
}
export function malformed(): never {
  throw createApiServiceError(
    'Dialpad returned an invalid or mismatched response. Reconcile uncertain effects before retrying.',
    { reason: 'dialpad_invalid_response', parent: {} }
  );
}
export const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return malformed();
  return value as Record<string, unknown>;
};
export const text = (value: unknown, label: string, maximum = 10000): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum)
    return invalid(`Provide a nonempty ${label}.`);
  try {
    encodeURIComponent(value);
  } catch {
    return invalid(`Provide valid Unicode for ${label}.`);
  }
  if ([...value].some(c => c.charCodeAt(0) === 0 || c.charCodeAt(0) === 127))
    return invalid(`Remove control characters from ${label}.`);
  return value;
};
export const credential = (value: unknown): string => {
  const token = text(value, 'API token');
  if ([...token].some(c => c.charCodeAt(0) <= 32))
    invalid('The API token must not contain whitespace or control characters.');
  return token;
};
export const nativeId = (value: unknown, label = 'resource ID', me = false): string => {
  if (me && value === 'me') return 'me';
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value <= 0)
      return invalid(`Provide an exact positive safe integer ${label}.`);
    return String(value);
  }
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value))
    return invalid(`Provide an exact decimal ${label}; use a discovery tool to find it.`);
  if (BigInt(value) > BigInt(Number.MAX_SAFE_INTEGER))
    return invalid(`The ${label} exceeds the supported exact numeric API range.`);
  return value;
};
export const responseId = (value: unknown, expected?: string): string => {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    !/^[1-9]\d*$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value))
  )
    return malformed();
  const id = String(value);
  if (expected && expected !== 'me' && id !== expected) malformed();
  return id;
};
export const contactId = (value: unknown): string => {
  const id = text(value, 'contact ID', 1000);
  if (
    id === '.' ||
    id === '..' ||
    [...id].some(c => c.charCodeAt(0) < 32) ||
    /[/\\?#]/.test(id)
  )
    invalid('Provide the exact contact ID returned by list_contacts or get_resource.');
  return id;
};
export const phone = (value: unknown): string => {
  if (typeof value !== 'string' || !/^\+[1-9]\d{1,14}$/.test(value))
    return invalid('Provide an E.164 phone number with its leading + and country code.');
  return value;
};
export const stringField = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return malformed();
  return value;
};
export const boolField = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') return malformed();
  return value;
};
export const strings = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some(v => typeof v !== 'string')) return malformed();
  return value;
};
export const optionalId = (value: unknown): string | undefined =>
  value === undefined || value === null ? undefined : responseId(value);
export const changes = (value: Record<string, unknown>): Record<string, unknown> => {
  const result = pickDefined(value);
  if (!Object.keys(result).length) invalid('Provide at least one supported field to update.');
  return result;
};
export const page = (
  value: unknown
): { items: Record<string, unknown>[]; cursor?: string } => {
  const data = object(value);
  if (!Object.hasOwn(data, 'items') || (data.items !== null && !Array.isArray(data.items)))
    return malformed();
  return {
    items: data.items === null ? [] : (data.items as unknown[]).map(object),
    cursor: stringField(data.cursor)
  };
};
export const timestamp = (value: unknown, input = false): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Date.parse(value)
        : Number.NaN;
  if (
    !Number.isFinite(number) ||
    !Number.isSafeInteger(number) ||
    number < 0 ||
    number > 8640000000000000
  )
    return input ? invalid('Provide an ISO 8601 timestamp with a timezone.') : malformed();
  if (
    input &&
    (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value))
  )
    invalid('Provide an ISO 8601 timestamp with a timezone.');
  if (input && typeof value === 'string') {
    const year = Number(value.slice(0, 4)),
      month = Number(value.slice(5, 7)),
      day = Number(value.slice(8, 10));
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    if (days === undefined || day < 1 || day > days)
      invalid('Provide a real calendar date in the ISO 8601 timestamp.');
  }
  return new Date(number).toISOString();
};

export const safeJson = (
  value: unknown,
  secrets: readonly string[],
  response = false
): void => {
  const fail = (): never =>
    response
      ? malformed()
      : invalid(
          'Request data must be bounded valid JSON and must not contain an active credential.'
        );
  const variants = new Set<string>();
  for (const secret of secrets)
    if (secret) {
      variants.add(secret);
      variants.add(encodeURIComponent(secret));
      variants.add(Buffer.from(secret).toString('base64'));
      variants.add(Buffer.from(secret).toString('base64url'));
    }
  const inspect = (value: string) => {
    try {
      encodeURIComponent(value);
    } catch {
      fail();
    }
    let candidates = [value];
    for (let depth = 0; depth <= 3; depth++) {
      const next: string[] = [];
      for (const candidate of candidates) {
        if ([...variants].some(secret => candidate.includes(secret))) fail();
        if (depth === 3) continue;
        try {
          const decoded = decodeURIComponent(candidate);
          if (decoded !== candidate) next.push(decoded);
        } catch {
          /* Literal percent characters are allowed. */
        }
        const unicode = candidate.replace(/\\u([\da-f]{4})/gi, (_, hex: string) =>
          String.fromCharCode(Number.parseInt(hex, 16))
        );
        if (unicode !== candidate) next.push(unicode);
        for (const part of candidate.matchAll(/[A-Za-z0-9+/_-]{12,}={0,2}/g)) {
          const bytes = Buffer.from(part[0], 'base64');
          if (
            bytes.toString('base64').replace(/=+$/, '') ===
            part[0].replaceAll('-', '+').replaceAll('_', '/').replace(/=+$/, '')
          ) {
            const decoded = bytes.toString('utf8');
            if (Buffer.from(decoded).equals(bytes) && decoded !== candidate)
              next.push(decoded);
          }
        }
      }
      if (next.length > 64) fail();
      candidates = [...new Set(next)];
    }
  };
  const seen = new Set<object>();
  let nodes = 0;
  const visit = (item: unknown, depth: number): void => {
    if (++nodes > 30000 || depth > 25) fail();
    if (item === undefined || item === null || typeof item === 'boolean') return;
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) fail();
      return;
    }
    if (typeof item === 'string') {
      inspect(item);
      return;
    }
    if (typeof item !== 'object' || seen.has(item)) fail();
    seen.add(item);
    if (Array.isArray(item)) item.forEach(v => visit(v, depth + 1));
    else {
      const proto = Object.getPrototypeOf(item);
      if (proto !== Object.prototype && proto !== null) fail();
      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(item))) {
        if (
          !('value' in descriptor) ||
          ['__proto__', 'prototype', 'constructor'].includes(key)
        )
          fail();
        inspect(key);
        visit(descriptor.value, depth + 1);
      }
    }
    seen.delete(item);
  };
  visit(value, 0);
  if (Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8') > 4 * 1024 * 1024) fail();
};
