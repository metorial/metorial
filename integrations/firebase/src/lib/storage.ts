import { Buffer } from 'node:buffer';
import { createAxios } from '@slates/provider';
import { withFirebaseApiError } from './errors';

let storageAxios = createAxios({
  baseURL: 'https://storage.googleapis.com'
});

let storageUploadAxios = createAxios({
  baseURL: 'https://storage.googleapis.com/upload/storage/v1'
});

export interface StorageObject {
  objectName: string;
  bucket: string;
  contentType?: string;
  size?: string;
  timeCreated?: string;
  updated?: string;
  md5Hash?: string;
  mediaLink?: string;
  selfLink?: string;
  generation?: string;
}

let mapStorageObject = (obj: any): StorageObject => ({
  objectName: obj.name,
  bucket: obj.bucket,
  contentType: obj.contentType,
  size: obj.size,
  timeCreated: obj.timeCreated,
  updated: obj.updated,
  md5Hash: obj.md5Hash,
  mediaLink: obj.mediaLink,
  selfLink: obj.selfLink,
  generation: obj.generation
});

export class StorageClient {
  private token: string;
  private bucket: string;

  constructor(params: { token: string; bucket: string }) {
    this.token = params.token;
    this.bucket = params.bucket;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`
    };
  }

  async listObjects(params?: {
    prefix?: string;
    delimiter?: string;
    maxResults?: number;
    pageToken?: string;
  }): Promise<{
    objects: StorageObject[];
    prefixes?: string[];
    nextPageToken?: string;
  }> {
    let response = await withFirebaseApiError('Cloud Storage list objects', () =>
      storageAxios.get(`/storage/v1/b/${this.bucket}/o`, {
        headers: this.headers,
        params: {
          prefix: params?.prefix,
          delimiter: params?.delimiter,
          maxResults: params?.maxResults || 100,
          pageToken: params?.pageToken
        }
      })
    );

    return {
      objects: (response.data.items || []).map(mapStorageObject),
      prefixes: response.data.prefixes,
      nextPageToken: response.data.nextPageToken
    };
  }

  async getObjectMetadata(objectPath: string): Promise<StorageObject> {
    let encodedPath = encodeURIComponent(objectPath);
    let response = await withFirebaseApiError('Cloud Storage get object metadata', () =>
      storageAxios.get(`/storage/v1/b/${this.bucket}/o/${encodedPath}`, {
        headers: this.headers
      })
    );

    return mapStorageObject(response.data);
  }

  async deleteObject(objectPath: string): Promise<void> {
    let encodedPath = encodeURIComponent(objectPath);
    await withFirebaseApiError('Cloud Storage delete object', () =>
      storageAxios.delete(`/storage/v1/b/${this.bucket}/o/${encodedPath}`, {
        headers: this.headers
      })
    );
  }

  async getDownloadUrl(objectPath: string): Promise<string> {
    let encodedPath = encodeURIComponent(objectPath);
    let response = await withFirebaseApiError('Cloud Storage get download URL', () =>
      storageAxios.get(`/storage/v1/b/${this.bucket}/o/${encodedPath}`, {
        headers: this.headers,
        params: { alt: 'json' }
      })
    );

    return response.data.mediaLink || '';
  }

  async copyObject(
    sourceObjectPath: string,
    destinationBucket: string,
    destinationObjectPath: string
  ): Promise<StorageObject> {
    let encodedSource = encodeURIComponent(sourceObjectPath);
    let encodedDest = encodeURIComponent(destinationObjectPath);

    let response = await withFirebaseApiError('Cloud Storage copy object', () =>
      storageAxios.post(
        `/storage/v1/b/${this.bucket}/o/${encodedSource}/copyTo/b/${destinationBucket}/o/${encodedDest}`,
        {},
        {
          headers: this.headers
        }
      )
    );

    return mapStorageObject(response.data);
  }

  async updateObjectMetadata(
    objectPath: string,
    metadata: Record<string, string>
  ): Promise<StorageObject> {
    let encodedPath = encodeURIComponent(objectPath);
    let response = await withFirebaseApiError('Cloud Storage update object metadata', () =>
      storageAxios.patch(
        `/storage/v1/b/${this.bucket}/o/${encodedPath}`,
        {
          metadata
        },
        {
          headers: this.headers
        }
      )
    );

    return mapStorageObject(response.data);
  }

  async uploadObject(params: {
    objectPath: string;
    contentBase64: string;
    contentType?: string;
    customMetadata?: Record<string, string>;
  }): Promise<StorageObject> {
    let response = await withFirebaseApiError('Cloud Storage upload object', () =>
      storageUploadAxios.post(
        `/b/${this.bucket}/o`,
        Buffer.from(params.contentBase64, 'base64'),
        {
          headers: {
            ...this.headers,
            'Content-Type': params.contentType || 'application/octet-stream'
          },
          params: {
            uploadType: 'media',
            name: params.objectPath
          }
        }
      )
    );

    if (params.customMetadata) {
      return this.updateObjectMetadata(params.objectPath, params.customMetadata);
    }

    return mapStorageObject(response.data);
  }
}
