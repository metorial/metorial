import { createAxios } from 'slates';

export let getBaseUrl = (environment: string): string => {
  return environment === 'development'
    ? 'https://connect.dev.instacart.tools'
    : 'https://connect.instacart.com';
};

export let createAuthenticatedAxios = (token: string, environment: string) => {
  return createAxios({
    baseURL: getBaseUrl(environment),
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  });
};
