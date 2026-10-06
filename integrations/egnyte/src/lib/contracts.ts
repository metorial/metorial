import { buildApiServiceError, createApiServiceError, getApiErrorStatus } from 'slates';

export type RecordValue = Record<string, unknown>;
export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'egnyte_validation' });
export const record = (value: unknown): RecordValue => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw invalid('Egnyte returned an invalid object.');
  return value as RecordValue;
};
export const text = (value: unknown, field = 'identifier'): string => {
  if (typeof value !== 'string' || !value.trim()) throw invalid(`Provide a valid ${field}.`);
  return value;
};
export const noControls = (value: string) => {
  if ([...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127))
    throw invalid('Control characters are not allowed in identifiers or credentials.');
  try {
    encodeURIComponent(value);
  } catch {
    throw invalid('Identifiers and credentials must contain valid Unicode.');
  }
  return value;
};
export const identifier = (value: unknown) => {
  const result = noControls(text(value));
  if (result === '.' || result === '..' || /[/\\?#]/.test(result))
    throw invalid('Provide a single resource identifier.');
  return encodeURIComponent(result);
};
export const integer = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    throw invalid(`Provide an integer between ${min} and ${max}.`);
  return value;
};
export const domainName = (value: unknown): string => {
  const domain = text(value, 'domain').toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(domain))
    throw invalid('Enter only the Egnyte domain name, without a URL or suffix.');
  return domain;
};
export const absolutePath = (value: unknown): string => {
  const path = noControls(text(value, 'file or folder path'));
  const segments = path.replace(/^\//, '').split('/');
  if (segments.some(part => !part || part === '.' || part === '..') || path.includes('\\'))
    throw invalid(
      'Provide a complete file or folder path without empty or relative segments.'
    );
  return `/${segments.join('/')}`;
};
export const encodePath = (value: unknown) =>
  absolutePath(value).slice(1).split('/').map(encodeURIComponent).join('/');
export const optionalPage = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  value === undefined ? undefined : integer(value, min, max);
export const requiredList = (value: unknown): RecordValue[] => {
  if (!Array.isArray(value)) throw invalid('Egnyte returned an invalid result list.');
  return value.map(record);
};
export const bindId = (value: unknown, expected: string | number, field = 'id') => {
  const result = record(value);
  if (String(result[field]) !== String(expected))
    throw invalid('Egnyte returned a different resource than requested.');
  return result;
};
export const ensurePrivate = (value: unknown, secrets: readonly string[]) => {
  const check = (candidate: string) => {
    const representations = [candidate];
    for (let i = 0; i < 2; i++) {
      const previous = representations.at(-1)!;
      const decoded = previous.replace(/(?:%[0-9a-f]{2})+/gi, encoded => {
        const bytes = encoded
          .match(/%[0-9a-f]{2}/gi)!
          .map(byte => Number.parseInt(byte.slice(1), 16));
        return new TextDecoder().decode(new Uint8Array(bytes));
      });
      representations.push(decoded);
      if (decoded === previous) break;
    }
    if (secrets.filter(Boolean).some(secret => representations.some(s => s.includes(secret))))
      throw invalid('Egnyte returned credential material in a data field.');
  };
  const visit = (item: unknown) => {
    if (typeof item === 'string') check(item);
    else if (Array.isArray(item)) item.forEach(visit);
    else if (item && typeof item === 'object')
      for (const [key, child] of Object.entries(item)) {
        check(key);
        visit(child);
      }
  };
  visit(value);
};
export const apiError = (error: unknown) =>
  buildApiServiceError(
    {
      response: {
        status: getApiErrorStatus(error),
        data: {
          message:
            'The request could not be completed. Check permissions, input and connection.'
        }
      }
    },
    { providerLabel: 'Egnyte', operation: 'request', reason: 'egnyte_api_error', parent: {} }
  );
