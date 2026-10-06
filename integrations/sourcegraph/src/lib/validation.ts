import { createApiServiceError } from 'slates';

export const fail = (message: string, reason = 'invalid_input') =>
  createApiServiceError(`Sourcegraph: ${message}`, { reason });

export const text = (value: unknown, label: string, allowEmpty = false): string => {
  if (
    typeof value !== 'string' ||
    (!allowEmpty && !value.trim()) ||
    value.length > 8192 ||
    [...value].some(character => character.charCodeAt(0) === 0)
  ) {
    throw fail(
      `${label} must be ${allowEmpty ? 'a' : 'a nonempty'} string of at most 8192 characters.`
    );
  }
  return value;
};

export const pageSize = (value: number | undefined) => {
  const size = value ?? 50;
  if (!Number.isSafeInteger(size) || size < 1 || size > 100) {
    throw fail('first must be an integer from 1 to 100. Continue with the returned cursor.');
  }
  return size;
};

export const instanceUrl = (value: unknown): string => {
  text(value, 'instanceUrl');
  let url: URL;
  try {
    url = new URL(value as string);
  } catch {
    throw fail('Use an absolute Sourcegraph instance URL.');
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    /%|\\/.test(url.pathname)
  ) {
    throw fail(
      'Use an HTTPS instance URL without credentials, query, fragment or encoded path. HTTP is supported only for local development.'
    );
  }
  return url.href.replace(/\/+$/, '');
};

export const token = (value: unknown): string => {
  const result = text(value, 'Access token');
  if (!/^[A-Za-z0-9._~+/-]+$/.test(result))
    throw fail('Use the unmodified access token without whitespace, quotes or header syntax.');
  return result;
};

export const sudoUsername = (value: unknown): string => {
  const result = text(value, 'Sudo username');
  if (
    [...result].some(
      character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    ) ||
    /["\\,]/.test(result)
  ) {
    throw fail(
      'Sudo username must not contain control characters, quotes, commas or backslashes.'
    );
  }
  return result;
};

export const notificationUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw fail('Notification URLs must be absolute HTTPS URLs.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash)
    throw fail('Notification URLs must use HTTPS without user credentials or a fragment.');
  return value;
};
