import { createApiServiceError } from 'slates';

export function invalid(message: string): never {
  throw createApiServiceError(message, { reason: 'invalid_input' });
}
export function malformed(): never {
  throw createApiServiceError(
    'Budibase returned an unexpected or mismatched response. Verify the resource and API permissions; read back an uncertain write before retrying.',
    { reason: 'invalid_provider_response' }
  );
}
export const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return malformed();
  return value as Record<string, unknown>;
};
export const records = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value) || value.length > 5000) return malformed();
  return value.map(object);
};
export const required = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > 1000)
    return invalid(`${label} is required and must be a bounded string.`);
  try {
    encodeURIComponent(value);
  } catch {
    return invalid(`${label} must contain well-formed Unicode.`);
  }
  return value;
};
export const pathId = (value: unknown, label: string): string => {
  const id = required(value, label);
  if (
    id.length > 256 ||
    id === '.' ||
    id === '..' ||
    [...id].some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127) ||
    /[\\/%?#]/.test(id)
  )
    return invalid(
      `${label} must be one exact native resource ID, without path separators or encoded paths.`
    );
  return id;
};
export const appId = (value: unknown): string => {
  const id = pathId(value, 'Application/workspace ID');
  if (!id.startsWith('app_') || id === 'app_metadata')
    invalid(
      'Use the native appId from application discovery or the dashboard workspace URL, not app_metadata.'
    );
  return id;
};
export const baseUrl = (value: unknown): string => {
  const text = required(value, 'Public API base URL');
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return invalid('Provide the Budibase instance URL ending in /api/public/v1.');
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.hostname ||
    !/^\/api\/public\/v1\/?$/.test(url.pathname) ||
    !/^https?:\/\/[^/?#]+\/api\/public\/v1\/?$/.test(text) ||
    text.trim() !== text ||
    /[\\%]/.test(text)
  )
    invalid(
      'Use an explicit HTTP or HTTPS instance URL ending in /api/public/v1, without credentials, query, fragment or encoded paths.'
    );
  return `${url.origin}/api/public/v1`;
};
export const credentialVariants = (value: unknown): string[] => {
  const token = required(value, 'API key');
  if ([...token].some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127))
    invalid('The API key must not contain whitespace or control characters.');
  return [
    ...new Set([
      token,
      encodeURIComponent(token),
      Buffer.from(token).toString('base64'),
      Buffer.from(token).toString('base64url')
    ])
  ];
};
const checkText = (text: string, secrets: readonly string[], response: boolean): void => {
  const fail = () =>
    response
      ? malformed()
      : invalid('Request fields must not contain the active API credential.');
  const candidates = [{ text, depth: 0 }];
  const seen = new Set<string>();
  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index];
    if (!candidate || seen.has(candidate.text)) continue;
    seen.add(candidate.text);
    if (secrets.some(secret => secret && candidate.text.includes(secret))) fail();
    if (candidate.depth >= 3) continue;
    const add = (decoded: string) => {
      if (decoded === candidate.text || seen.has(decoded)) return;
      if (candidates.length >= 32) fail();
      candidates.push({ text: decoded, depth: candidate.depth + 1 });
    };
    try {
      add(decodeURIComponent(candidate.text));
    } catch {
      /* Literal percent text is valid JSON data. */
    }
    add(
      candidate.text.replace(/\\u([0-9a-f]{4})/gi, (_, hex: string) =>
        String.fromCharCode(Number.parseInt(hex, 16))
      )
    );
    for (const match of candidate.text.matchAll(/[A-Za-z0-9+/_-]{12,}={0,2}/g)) {
      const bytes = Buffer.from(match[0], 'base64');
      const decoded = bytes.toString('utf8');
      if (
        bytes.toString('base64').replace(/=+$/, '') ===
          match[0].replaceAll('-', '+').replaceAll('_', '/').replace(/=+$/, '') &&
        Buffer.from(decoded).equals(bytes)
      )
        add(decoded);
    }
  }
};
export const safeJson = (
  value: unknown,
  secrets: readonly string[] = [],
  response = false,
  maximumBytes = 4 * 1024 * 1024
): void => {
  const seen = new Set<object>();
  let nodes = 0;
  const fail = () =>
    response
      ? malformed()
      : invalid(
          'Provide bounded, finite JSON data without cyclic objects or unsafe property names.'
        );
  const visit = (item: unknown, depth: number): void => {
    if (++nodes > 30000 || depth > 25) fail();
    if (item === undefined || item === null || typeof item === 'boolean') return;
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) fail();
      return;
    }
    if (typeof item === 'string') {
      try {
        encodeURIComponent(item);
      } catch {
        fail();
      }
      checkText(item, secrets, response);
      return;
    }
    if (!item || typeof item !== 'object' || seen.has(item)) fail();
    seen.add(item);
    if (Array.isArray(item)) item.forEach(entry => visit(entry, depth + 1));
    else {
      const prototype = Object.getPrototypeOf(item);
      if (prototype !== Object.prototype && prototype !== null) fail();
      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(item))) {
        if (
          !('value' in descriptor) ||
          ['__proto__', 'constructor', 'prototype'].includes(key)
        )
          fail();
        checkText(key, secrets, response);
        visit(descriptor.value, depth + 1);
      }
    }
    seen.delete(item);
  };
  visit(value, 0);
  if (Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8') > maximumBytes) fail();
};
export const changes = (value: Record<string, unknown>): Record<string, unknown> => {
  const result = Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  );
  if (!Object.keys(result).length) invalid('Provide at least one field to update.');
  safeJson(result);
  return result;
};

// Native exports are gzip tarballs. Validate framing only; never extract or interpret paths.
export const validateTarArchive = (bytes: Uint8Array): void => {
  const blockSize = 512;
  if (bytes.length < 2 * blockSize || bytes.length % blockSize !== 0) malformed();
  const octal = (field: Uint8Array): number => {
    const text = Buffer.from(field).toString('ascii').split('\0', 1)[0]?.trim() ?? '';
    if (text && !/^[0-7]+$/.test(text)) return malformed();
    const value = text ? Number.parseInt(text, 8) : 0;
    if (!Number.isSafeInteger(value) || value < 0) return malformed();
    return value;
  };
  for (let offset = 0; offset < bytes.length; ) {
    const header = bytes.subarray(offset, offset + blockSize);
    if (header.every(byte => byte === 0)) {
      if (
        bytes.length - offset < 2 * blockSize ||
        !bytes.subarray(offset).every(byte => byte === 0)
      )
        malformed();
      return;
    }
    if (!header.subarray(0, 100).some(byte => byte !== 0)) malformed();
    const checksum = octal(header.subarray(148, 156));
    let unsignedSum = 0,
      signedSum = 0;
    for (let index = 0; index < blockSize; index++) {
      const byte = index >= 148 && index < 156 ? 32 : (header[index] ?? 0);
      unsignedSum += byte;
      signedSum += byte > 127 ? byte - 256 : byte;
    }
    if (checksum !== unsignedSum && checksum !== signedSum) malformed();
    const sizeField = header.subarray(124, 136);
    let size: number;
    if ((sizeField[0] ?? 0) & 0x80) {
      // GNU's positive base-256 size form; reject negative or out-of-bound values.
      if ((sizeField[0] ?? 0) & 0x40) malformed();
      size = (sizeField[0] ?? 0) & 0x3f;
      for (const byte of sizeField.subarray(1)) {
        size = size * 256 + byte;
        if (size > bytes.length) malformed();
      }
    } else size = octal(sizeField);
    offset += blockSize + Math.ceil(size / blockSize) * blockSize;
    if (!Number.isSafeInteger(offset) || offset > bytes.length - 2 * blockSize) malformed();
  }
  malformed();
};
