import { type AuthType, createServiceClient } from './client';

let BASE_URL = 'https://dns.api.cloud.yandex.net';

export let listDnsZones = async (
  auth: AuthType,
  folderId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = { folderId };
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/dns/v1/zones', { params });
  return response.data;
};

export let getDnsZone = async (auth: AuthType, dnsZoneId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.get(`/dns/v1/zones/${dnsZoneId}`);
  return response.data;
};

export let createDnsZone = async (
  auth: AuthType,
  params: {
    folderId: string;
    name: string;
    description?: string;
    zone: string;
    publicVisibility?: {};
    privateVisibility?: {
      networkIds: string[];
    };
    labels?: Record<string, string>;
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post('/dns/v1/zones', params);
  return response.data;
};

export let deleteDnsZone = async (auth: AuthType, dnsZoneId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.delete(`/dns/v1/zones/${dnsZoneId}`);
  return response.data;
};

export let listRecordSets = async (
  auth: AuthType,
  dnsZoneId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = {};
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get(`/dns/v1/zones/${dnsZoneId}:listRecordSets`, { params });
  return response.data;
};

export let upsertRecordSets = async (
  auth: AuthType,
  dnsZoneId: string,
  params: {
    merges: Array<{
      name: string;
      type: string;
      ttl: number;
      data: string[];
    }>;
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post(`/dns/v1/zones/${dnsZoneId}:upsertRecordSets`, params);
  return response.data;
};

export let updateRecordSets = async (
  auth: AuthType,
  dnsZoneId: string,
  params: {
    deletions?: Array<{
      name: string;
      type: string;
      ttl: number;
      data: string[];
    }>;
    additions?: Array<{
      name: string;
      type: string;
      ttl: number;
      data: string[];
    }>;
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post(`/dns/v1/zones/${dnsZoneId}:updateRecordSets`, params);
  return response.data;
};
