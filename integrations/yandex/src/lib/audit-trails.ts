import { type AuthType, createServiceClient } from './client';

let BASE_URL = 'https://audit-trails.api.cloud.yandex.net';

export let listTrails = async (
  auth: AuthType,
  folderId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = { folderId };
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/audit-trails/v1/trails', { params });
  return response.data;
};

export let listEvents = async (
  auth: AuthType,
  folderId: string,
  params?: {
    pageSize?: number;
    pageToken?: string;
    filter?: string;
  }
) => {
  let client = createServiceClient('https://auditlog.api.cloud.yandex.net', auth);
  let queryParams: Record<string, string | number> = { folderId };
  if (params?.pageSize) queryParams.pageSize = params.pageSize;
  if (params?.pageToken) queryParams.pageToken = params.pageToken;
  if (params?.filter) queryParams.filter = params.filter;
  let response = await client.get('/audit-log/v1/events', { params: queryParams });
  return response.data;
};
