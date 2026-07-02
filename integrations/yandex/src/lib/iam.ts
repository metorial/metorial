import { type AuthType, createServiceClient } from './client';

let BASE_URL = 'https://iam.api.cloud.yandex.net';

export let listServiceAccounts = async (
  auth: AuthType,
  folderId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = { folderId };
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/iam/v1/serviceAccounts', { params });
  return response.data;
};

export let getServiceAccount = async (auth: AuthType, serviceAccountId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.get(`/iam/v1/serviceAccounts/${serviceAccountId}`);
  return response.data;
};

export let createServiceAccount = async (
  auth: AuthType,
  params: {
    folderId: string;
    name: string;
    description?: string;
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post('/iam/v1/serviceAccounts', params);
  return response.data;
};

export let deleteServiceAccount = async (auth: AuthType, serviceAccountId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.delete(`/iam/v1/serviceAccounts/${serviceAccountId}`);
  return response.data;
};

export let listApiKeys = async (
  auth: AuthType,
  serviceAccountId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = { serviceAccountId };
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/iam/v1/apiKeys', { params });
  return response.data;
};

export let createApiKey = async (
  auth: AuthType,
  params: {
    serviceAccountId: string;
    description?: string;
    scopes?: string[];
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post('/iam/v1/apiKeys', params);
  return response.data;
};

export let deleteApiKey = async (auth: AuthType, apiKeyId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.delete(`/iam/v1/apiKeys/${apiKeyId}`);
  return response.data;
};

export let listAccessBindings = async (
  auth: AuthType,
  resourceId: string,
  resourceType: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient('https://resource-manager.api.cloud.yandex.net', auth);
  let params: Record<string, string | number> = {};
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get(`/${resourceType}/${resourceId}:listAccessBindings`, {
    params
  });
  return response.data;
};
