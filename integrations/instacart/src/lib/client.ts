import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios as createBearerAxios
} from 'slates';

export let getBaseUrl = (environment: string): string => {
  return environment === 'development'
    ? 'https://connect.dev.instacart.tools'
    : 'https://connect.instacart.com';
};

export let validateConnectBaseUrl = (value: string): string => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('Enter the HTTPS Connect server URL assigned by Instacart.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    !(
      url.hostname === 'connect.instacart.com' ||
      url.hostname.endsWith('.instacart.com') ||
      url.hostname.endsWith('.instacart.tools')
    )
  ) {
    throw createApiServiceError(
      'Use an HTTPS Instacart Connect server origin without a path.'
    );
  }
  return url.origin;
};

export let createAuthenticatedAxios = (
  token: string,
  environment: string,
  baseUrl?: string
) => {
  return createBearerAxios({
    baseURL: baseUrl ? validateConnectBaseUrl(baseUrl) : getBaseUrl(environment),
    authHeader: { value: `Bearer ${token}` },
    headers: { Accept: 'application/json' },
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'Instacart',
        reason: 'instacart_api_error',
        operation: 'API request',
        extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
        detailKeys: ['message', 'error_description', 'code', 'error_code', 'key'],
        nestedKeys: ['error', 'errors', 'meta']
      })
  });
};
