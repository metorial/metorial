import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  userId?: string;
}

export let buildStatsClient = (config: ClientConfig) => {
  return createAxios({
    baseURL: 'https://simpleanalytics.com',
    headers: {
      'Api-Key': config.token,
      'Content-Type': 'application/json'
    }
  });
};

export let buildAdminClient = (config: ClientConfig) => {
  if (!config.userId) {
    throw new Error(
      'User-Id is required for the Admin API. Please provide your Simple Analytics User ID in the authentication settings.'
    );
  }
  return createAxios({
    baseURL: 'https://simpleanalytics.com',
    headers: {
      'Api-Key': config.token,
      'User-Id': config.userId,
      'Content-Type': 'application/json'
    }
  });
};

export let buildExportClient = (config: ClientConfig) => {
  if (!config.userId) {
    throw new Error(
      'User-Id is required for the Export API. Please provide your Simple Analytics User ID in the authentication settings.'
    );
  }
  return createAxios({
    baseURL: 'https://simpleanalytics.com',
    headers: {
      'Api-Key': config.token,
      'User-Id': config.userId
    }
  });
};
