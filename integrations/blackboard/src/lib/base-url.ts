import { createApiServiceError } from 'slates';

export let normalizeBaseUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('Enter an absolute Blackboard Learn instance URL.');
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw createApiServiceError(
      'Use an HTTP or HTTPS Blackboard Learn instance URL without credentials, query parameters, or a fragment.'
    );
  }
  return url.toString().replace(/\/+$/, '');
};
