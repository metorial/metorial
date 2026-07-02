import { type AuthType, createServiceClient } from './client';

// Yandex Object Storage uses the S3-compatible REST API via IAM token auth
// Base endpoint for the S3-compatible API
let S3_BASE_URL = 'https://storage.yandexcloud.net';

// Storage management API endpoint (for bucket operations using IAM token)
let STORAGE_API_URL = 'https://storage.api.cloud.yandex.net';

export let listBuckets = async (auth: AuthType) => {
  let client = createServiceClient(S3_BASE_URL, auth);
  let response = await client.get('/');
  return response.data;
};

export let createBucket = async (
  auth: AuthType,
  params: {
    folderId: string;
    name: string;
    defaultStorageClass?: string;
    maxSize?: number;
    anonymousAccessFlags?: {
      read?: boolean;
      list?: boolean;
      configRead?: boolean;
    };
  }
) => {
  let client = createServiceClient(STORAGE_API_URL, auth);
  let response = await client.post('/storage/v1/buckets', params);
  return response.data;
};

export let getBucket = async (auth: AuthType, bucketName: string) => {
  let client = createServiceClient(STORAGE_API_URL, auth);
  let response = await client.get(`/storage/v1/buckets/${bucketName}`);
  return response.data;
};

export let deleteBucket = async (auth: AuthType, bucketName: string) => {
  let client = createServiceClient(STORAGE_API_URL, auth);
  let response = await client.delete(`/storage/v1/buckets/${bucketName}`);
  return response.data;
};

export let updateBucket = async (
  auth: AuthType,
  bucketName: string,
  params: {
    anonymousAccessFlags?: {
      read?: boolean;
      list?: boolean;
      configRead?: boolean;
    };
    defaultStorageClass?: string;
    maxSize?: number;
    versioning?: 'VERSIONING_DISABLED' | 'VERSIONING_ENABLED' | 'VERSIONING_SUSPENDED';
    updateMask: string;
  }
) => {
  let client = createServiceClient(STORAGE_API_URL, auth);
  let response = await client.patch(`/storage/v1/buckets/${bucketName}`, params);
  return response.data;
};

export let listObjects = async (
  auth: AuthType,
  bucketName: string,
  prefix?: string,
  maxKeys?: number,
  continuationToken?: string
) => {
  let client = createServiceClient(S3_BASE_URL, auth);
  let params: Record<string, string | number> = { 'list-type': 2 };
  if (prefix) params.prefix = prefix;
  if (maxKeys) params['max-keys'] = maxKeys;
  if (continuationToken) params['continuation-token'] = continuationToken;
  let response = await client.get(`/${bucketName}`, { params });
  return response.data;
};
