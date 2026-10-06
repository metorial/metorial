import { ServiceError } from '@lowerdeck/error';
import { AuthConfigSecretRedactor, buildApiServiceError, createApiServiceError } from 'slates';
import { z } from 'zod';

export { z };
export function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw createApiServiceError(message);
}
export function credential(value: unknown): asserts value is string {
  requireValue(
    typeof value === 'string' &&
      value.length > 0 &&
      value.length <= 4096 &&
      [...value].every(c => c.charCodeAt(0) >= 33 && c.charCodeAt(0) <= 126),
    'Provide an Exa API key without whitespace or control characters.'
  );
}
export function id(value: string) {
  requireValue(
    value.length > 0 &&
      value.length <= 300 &&
      value.isWellFormed() &&
      [...value].every(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127),
    'Provide the exact resource ID or documented external ID from the corresponding list or create result.'
  );
  return encodeURIComponent(value);
}
export function integer(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER) {
  requireValue(
    typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max,
    `Provide an integer between ${min} and ${max}.`
  );
}
export function text(value: string, max = 5000, min = 1) {
  requireValue(
    value.length >= min && value.length <= max && value.isWellFormed(),
    `Provide text between ${min} and ${max} characters.`
  );
}
export function url(value: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw createApiServiceError('Provide an absolute HTTP or HTTPS URL.');
  }
  requireValue(
    ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password,
    'Provide an HTTP or HTTPS URL without embedded credentials.'
  );
}
export function safeJson(value: unknown, secrets: readonly string[]) {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw createApiServiceError('Exa data is not valid JSON.');
  }
  requireValue(
    typeof serialized === 'string' && Buffer.byteLength(serialized) <= 16 * 1024 * 1024,
    'Exa data exceeds the local 16 MiB safety bound or is invalid. Request a smaller result.'
  );
  const variants = new Set<string>();
  for (const secret of secrets.filter(Boolean)) {
    variants.add(secret);
    variants.add(Buffer.from(secret).toString('hex'));
    variants.add(Buffer.from(secret).toString('hex').toUpperCase());
    let percent = secret,
      base64 = secret,
      base64url = secret;
    for (let depth = 0; depth < 5; depth++) {
      percent = encodeURIComponent(percent);
      base64 = Buffer.from(base64).toString('base64');
      base64url = Buffer.from(base64url).toString('base64url');
      for (const v of [percent, base64, base64url]) variants.add(v);
    }
  }
  const redactor = new AuthConfigSecretRedactor({ variants: [...variants] });
  const strings = [serialized];
  const visit = (v: unknown) => {
    if (typeof v === 'string') strings.push(v);
    else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object')
      for (const [k, item] of Object.entries(v)) {
        strings.push(k);
        visit(item);
      }
  };
  visit(value);
  for (const original of strings) {
    let candidates = [original];
    for (let depth = 0; depth < 2; depth++)
      for (const s of [...candidates]) {
        try {
          candidates.push(decodeURIComponent(s));
        } catch {
          /* Ordinary text need not be encoded. */
        }
        candidates.push(
          s.replace(/\\u([0-9a-fA-F]{4})/g, (_, n: string) =>
            String.fromCharCode(Number.parseInt(n, 16))
          )
        );
        for (const piece of s.match(/[A-Za-z0-9+/_=-]{8,16384}/g) ?? [])
          candidates.push(Buffer.from(piece, 'base64').toString('utf8'));
      }
    requireValue(
      !candidates.some(s => redactor.redactEmbedded(s) !== s),
      'Exa returned or received credential-bearing data. Remove credentials from search text and metadata; this result cannot be exposed.'
    );
  }
}
export function upstream(error: unknown, operation: string) {
  if (error instanceof ServiceError) return error;
  return buildApiServiceError(error, {
    providerLabel: 'Exa',
    operation,
    parent: {},
    reason:
      'Check the API key, credits, product access and rate limits. A dispatched operation may have incurred cost or retained state; inspect it before retrying.',
    formatMessage: c =>
      `Exa ${operation} failed${c.status ? ` (HTTP ${c.status})` : ''}. Check API key permissions, credits and rate limits before retrying.`
  });
}
export function pageInput(params: { cursor?: string; limit?: number }) {
  if (params.cursor !== undefined) text(params.cursor, 4096);
  if (params.limit !== undefined) integer(params.limit, 1, 100);
}
