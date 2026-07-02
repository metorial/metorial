import { type AuthType, createServiceClient } from './client';

let BASE_URL = 'https://serverless-functions.api.cloud.yandex.net';

export let listFunctions = async (
  auth: AuthType,
  folderId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = { folderId };
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/functions/v1/functions', { params });
  return response.data;
};

export let getFunction = async (auth: AuthType, functionId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.get(`/functions/v1/functions/${functionId}`);
  return response.data;
};

export let createFunction = async (
  auth: AuthType,
  params: {
    folderId: string;
    name: string;
    description?: string;
    labels?: Record<string, string>;
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post('/functions/v1/functions', params);
  return response.data;
};

export let deleteFunction = async (auth: AuthType, functionId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.delete(`/functions/v1/functions/${functionId}`);
  return response.data;
};

export let invokeFunction = async (auth: AuthType, functionId: string, payload?: unknown) => {
  let client = createServiceClient('https://functions.yandexcloud.net', auth);
  let response = await client.post(`/${functionId}`, payload);
  return response.data;
};

export let listFunctionVersions = async (
  auth: AuthType,
  functionId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = { functionId };
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/functions/v1/versions', { params });
  return response.data;
};

export let createFunctionVersion = async (
  auth: AuthType,
  params: {
    functionId: string;
    runtime: string;
    entrypoint: string;
    resources: {
      memory: number;
    };
    executionTimeout: string;
    serviceAccountId?: string;
    content?: string;
    description?: string;
    environment?: Record<string, string>;
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post('/functions/v1/versions', params);
  return response.data;
};

export let listTriggers = async (
  auth: AuthType,
  folderId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = { folderId };
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/triggers/v1/triggers', { params });
  return response.data;
};

export let getTrigger = async (auth: AuthType, triggerId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.get(`/triggers/v1/triggers/${triggerId}`);
  return response.data;
};
