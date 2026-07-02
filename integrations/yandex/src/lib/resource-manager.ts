import { type AuthType, createServiceClient } from './client';

let BASE_URL = 'https://resource-manager.api.cloud.yandex.net';

export let listClouds = async (auth: AuthType, pageSize?: number, pageToken?: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = {};
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/resource-manager/v1/clouds', { params });
  return response.data;
};

export let getCloud = async (auth: AuthType, cloudId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.get(`/resource-manager/v1/clouds/${cloudId}`);
  return response.data;
};

export let listFolders = async (
  auth: AuthType,
  cloudId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = { cloudId };
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/resource-manager/v1/folders', { params });
  return response.data;
};

export let getFolder = async (auth: AuthType, folderId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.get(`/resource-manager/v1/folders/${folderId}`);
  return response.data;
};

export let createFolder = async (
  auth: AuthType,
  params: {
    cloudId: string;
    name: string;
    description?: string;
    labels?: Record<string, string>;
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post('/resource-manager/v1/folders', params);
  return response.data;
};

export let deleteFolder = async (auth: AuthType, folderId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.delete(`/resource-manager/v1/folders/${folderId}`);
  return response.data;
};

export let updateFolder = async (
  auth: AuthType,
  folderId: string,
  params: {
    name?: string;
    description?: string;
    labels?: Record<string, string>;
    updateMask: string;
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.patch(`/resource-manager/v1/folders/${folderId}`, params);
  return response.data;
};
