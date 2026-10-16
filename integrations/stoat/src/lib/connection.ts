import { createApiServiceError } from 'slates';

export let defaultBaseUrl = 'https://api.stoat.chat';
export let legacyBaseUrl = 'https://api.revolt.chat';

export let validateBaseUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('Enter a valid Stoat API base URL.');
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw createApiServiceError(
      'Use an HTTP or HTTPS Stoat API URL without credentials, a query, or a fragment.'
    );
  }
  return value.replace(/\/+$/, '');
};
