import { type AuthType, createServiceClient } from './client';

let BASE_URL = 'https://logging.api.cloud.yandex.net';

export let listLogGroups = async (
  auth: AuthType,
  folderId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = { folderId };
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/logging/v1/logGroups', { params });
  return response.data;
};

export let readLogs = async (
  auth: AuthType,
  params: {
    logGroupId: string;
    resourceTypes?: string[];
    resourceIds?: string[];
    levels?: string[];
    pageSize?: number;
    pageToken?: string;
    since?: string;
    until?: string;
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post('/logging/v1/read', params);
  return response.data;
};

export let writeLogs = async (
  auth: AuthType,
  params: {
    logGroupId?: string;
    folderId?: string;
    entries: Array<{
      timestamp: string;
      level?: string;
      message: string;
      jsonPayload?: Record<string, unknown>;
    }>;
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post('/logging/v1/write', params);
  return response.data;
};
