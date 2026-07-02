import { type AuthType, createServiceClient } from './client';

export let listOperations = async (
  auth: AuthType,
  folderId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient('https://operation.api.cloud.yandex.net', auth);
  let params: Record<string, string | number> = { folderId };
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/operations/v1/operations', { params });
  return response.data;
};

export let getOperation = async (auth: AuthType, operationId: string) => {
  let client = createServiceClient('https://operation.api.cloud.yandex.net', auth);
  let response = await client.get(`/operations/v1/operations/${operationId}`);
  return response.data;
};
