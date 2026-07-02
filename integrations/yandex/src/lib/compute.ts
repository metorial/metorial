import { type AuthType, createServiceClient } from './client';

let BASE_URL = 'https://compute.api.cloud.yandex.net';

export let listInstances = async (
  auth: AuthType,
  folderId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = { folderId };
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/compute/v1/instances', { params });
  return response.data;
};

export let getInstance = async (auth: AuthType, instanceId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.get(`/compute/v1/instances/${instanceId}`);
  return response.data;
};

export let createInstance = async (
  auth: AuthType,
  params: {
    folderId: string;
    name: string;
    description?: string;
    zoneId: string;
    platformId: string;
    resourcesSpec: {
      memory: number;
      cores: number;
      coreFraction?: number;
    };
    bootDiskSpec: {
      diskSpec: {
        size: number;
        imageId?: string;
        snapshotId?: string;
        typeId?: string;
      };
      autoDelete?: boolean;
    };
    networkInterfaceSpecs: Array<{
      subnetId: string;
      primaryV4AddressSpec?: {
        oneToOneNatSpec?: {
          ipVersion?: string;
        };
      };
    }>;
    metadata?: Record<string, string>;
    labels?: Record<string, string>;
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post('/compute/v1/instances', params);
  return response.data;
};

export let deleteInstance = async (auth: AuthType, instanceId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.delete(`/compute/v1/instances/${instanceId}`);
  return response.data;
};

export let startInstance = async (auth: AuthType, instanceId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post(`/compute/v1/instances/${instanceId}:start`);
  return response.data;
};

export let stopInstance = async (auth: AuthType, instanceId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post(`/compute/v1/instances/${instanceId}:stop`);
  return response.data;
};

export let restartInstance = async (auth: AuthType, instanceId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post(`/compute/v1/instances/${instanceId}:restart`);
  return response.data;
};

export let updateInstance = async (
  auth: AuthType,
  instanceId: string,
  params: {
    name?: string;
    description?: string;
    labels?: Record<string, string>;
    metadata?: Record<string, string>;
    updateMask: string;
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.patch(`/compute/v1/instances/${instanceId}`, params);
  return response.data;
};

export let listDisks = async (
  auth: AuthType,
  folderId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = { folderId };
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/compute/v1/disks', { params });
  return response.data;
};

export let getDisk = async (auth: AuthType, diskId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.get(`/compute/v1/disks/${diskId}`);
  return response.data;
};

export let createDisk = async (
  auth: AuthType,
  params: {
    folderId: string;
    name?: string;
    description?: string;
    size: number;
    zoneId: string;
    typeId?: string;
    imageId?: string;
    snapshotId?: string;
    labels?: Record<string, string>;
  }
) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.post('/compute/v1/disks', params);
  return response.data;
};

export let deleteDisk = async (auth: AuthType, diskId: string) => {
  let client = createServiceClient(BASE_URL, auth);
  let response = await client.delete(`/compute/v1/disks/${diskId}`);
  return response.data;
};

export let listImages = async (
  auth: AuthType,
  folderId: string,
  pageSize?: number,
  pageToken?: string
) => {
  let client = createServiceClient(BASE_URL, auth);
  let params: Record<string, string | number> = { folderId };
  if (pageSize) params.pageSize = pageSize;
  if (pageToken) params.pageToken = pageToken;
  let response = await client.get('/compute/v1/images', { params });
  return response.data;
};
