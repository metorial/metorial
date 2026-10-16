import { createApiServiceError } from 'slates';

export let resolveBaseUrl = (authBaseUrl?: unknown, legacyBaseUrl?: unknown): string => {
  let value = authBaseUrl ?? legacyBaseUrl ?? 'https://api.ninox.com';
  if (typeof value !== 'string') {
    throw createApiServiceError('The Ninox API base URL must be a URL string.');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError(
      'Enter a valid Ninox API base URL, including http:// or https://.'
    );
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw createApiServiceError(
      'Use an HTTP or HTTPS Ninox instance URL without credentials, query parameters, or a fragment.'
    );
  }

  return url.toString().replace(/\/+$/, '').replace(/\/v1$/, '');
};
