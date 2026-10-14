import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface ClientConfig {
  token: string;
  userId?: string;
}

export let buildStatsClient = (config: ClientConfig) => {
  return createAuthenticatedAxios({
    baseURL: 'https://simpleanalytics.com',
    headers: {
      'Api-Key': config.token,
      'Content-Type': 'application/json'
    },
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'Simple Analytics',
        reason: 'simple_analytics_api_error'
      })
  });
};

export let buildAdminClient = (config: ClientConfig) => {
  if (!config.userId) {
    throw createApiServiceError(
      'User-Id is required for the Admin API. Please provide your Simple Analytics User ID in the authentication settings.'
    );
  }
  return createAuthenticatedAxios({
    baseURL: 'https://simpleanalytics.com',
    headers: {
      'Api-Key': config.token,
      'User-Id': config.userId,
      'Content-Type': 'application/json'
    },
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'Simple Analytics',
        reason: 'simple_analytics_api_error'
      })
  });
};

export let buildExportClient = (config: ClientConfig) => {
  if (!config.userId) {
    throw createApiServiceError(
      'User-Id is required for the Export API. Please provide your Simple Analytics User ID in the authentication settings.'
    );
  }
  return createAuthenticatedAxios({
    baseURL: 'https://simpleanalytics.com',
    headers: {
      'Api-Key': config.token,
      'User-Id': config.userId
    },
    contentType: false,
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'Simple Analytics',
        reason: 'simple_analytics_api_error'
      })
  });
};
