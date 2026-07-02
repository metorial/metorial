import { createAxios } from 'slates';

export type AuthType = {
  token: string;
  authType: 'iam_token' | 'api_key';
};

export let getAuthHeader = (auth: AuthType): string => {
  if (auth.authType === 'api_key') {
    return `Api-Key ${auth.token}`;
  }
  return `Bearer ${auth.token}`;
};

export let createServiceClient = (baseURL: string, auth: AuthType) => {
  return createAxios({
    baseURL,
    headers: {
      Authorization: getAuthHeader(auth),
      'Content-Type': 'application/json'
    }
  });
};
