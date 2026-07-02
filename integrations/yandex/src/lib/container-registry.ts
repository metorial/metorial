import { type AuthType, createServiceClient } from './client';

let BASE_URL = 'https://container-registry.api.cloud.yandex.net';

export let listRegistries = async (
  auth: AuthType,
  folderId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = { folderId };
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/container-registry/v1/registries', { params });
  return response.data;
};

export let getRegistry = async (auth: AuthType, registryId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.get(`/container-registry/v1/registries/${registryId}`);
  return response.data;
};

export let createRegistry = async (
  auth: AuthType,
  params: {
    folderId: string;
    name: string;
    labels?: Record<string, string>;
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post('/container-registry/v1/registries', params);
  return response.data;
};

export let deleteRegistry = async (auth: AuthType, registryId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.delete(`/container-registry/v1/registries/${registryId}`);
  return response.data;
};

export let listImages = async (
  auth: AuthType,
  registryId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = { registryId };
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/container-registry/v1/images', { params });
  return response.data;
};

export let deleteImage = async (auth: AuthType, imageId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.delete(`/container-registry/v1/images/${imageId}`);
  return response.data;
};
