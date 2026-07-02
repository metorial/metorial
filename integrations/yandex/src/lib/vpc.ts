import { type AuthType, createServiceClient } from './client';

let BASE_URL = 'https://vpc.api.cloud.yandex.net';

export let listNetworks = async (
  auth: AuthType,
  folderId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = { folderId };
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/vpc/v1/networks', { params });
  return response.data;
};

export let getNetwork = async (auth: AuthType, networkId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.get(`/vpc/v1/networks/${networkId}`);
  return response.data;
};

export let createNetwork = async (
  auth: AuthType,
  params: {
    folderId: string;
    name: string;
    description?: string;
    labels?: Record<string, string>;
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post('/vpc/v1/networks', params);
  return response.data;
};

export let deleteNetwork = async (auth: AuthType, networkId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.delete(`/vpc/v1/networks/${networkId}`);
  return response.data;
};

export let listSubnets = async (
  auth: AuthType,
  folderId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = { folderId };
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/vpc/v1/subnets', { params });
  return response.data;
};

export let getSubnet = async (auth: AuthType, subnetId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.get(`/vpc/v1/subnets/${subnetId}`);
  return response.data;
};

export let createSubnet = async (
  auth: AuthType,
  params: {
    folderId: string;
    name: string;
    description?: string;
    networkId: string;
    zoneId: string;
    v4CidrBlocks: string[];
    labels?: Record<string, string>;
    routeTableId?: string;
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post('/vpc/v1/subnets', params);
  return response.data;
};

export let deleteSubnet = async (auth: AuthType, subnetId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.delete(`/vpc/v1/subnets/${subnetId}`);
  return response.data;
};

export let listSecurityGroups = async (
  auth: AuthType,
  folderId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = { folderId };
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/vpc/v1/securityGroups', { params });
  return response.data;
};
