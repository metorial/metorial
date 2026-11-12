import { Buffer } from 'node:buffer';
import { createApiServiceError, createAxios, getApiErrorStatus } from 'slates';

export interface ClientConfig {
  token: string;
  projectId: string;
}

export class Client {
  private api: ReturnType<typeof createAxios>;
  private uploadApi: ReturnType<typeof createAxios>;

  constructor(private config: ClientConfig) {
    this.api = createAxios({
      baseURL: 'https://storage.googleapis.com/storage/v1',
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });

    this.uploadApi = createAxios({
      baseURL: 'https://storage.googleapis.com/upload/storage/v1',
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  // ── Buckets ──

  async listBuckets(params?: {
    project?: string;
    prefix?: string;
    maxResults?: number;
    pageToken?: string;
  }) {
    let response = await this.api.get('/b', {
      params: {
        project: params?.project ?? this.config.projectId,
        prefix: params?.prefix,
        maxResults: params?.maxResults,
        pageToken: params?.pageToken
      }
    });
    return response.data;
  }

  async getBucket(bucketName: string) {
    let response = await this.api.get(`/b/${encodeURIComponent(bucketName)}`);
    return response.data;
  }

  async createBucket(params: {
    name: string;
    location?: string;
    storageClass?: string;
    enableVersioning?: boolean;
    enableHierarchicalNamespace?: boolean;
  }) {
    let body: Record<string, any> = {
      name: params.name
    };

    if (params.location) body.location = params.location;
    if (params.storageClass) body.storageClass = params.storageClass;
    if (params.enableVersioning !== undefined) {
      body.versioning = { enabled: params.enableVersioning };
    }
    if (params.enableHierarchicalNamespace) {
      body.hierarchicalNamespace = { enabled: true };
    }

    let response = await this.api.post('/b', body, {
      params: { project: this.config.projectId }
    });
    return response.data;
  }

  async updateBucket(
    bucketName: string,
    params: {
      storageClass?: string;
      enableVersioning?: boolean;
      lifecycle?: any;
      website?: { mainPageSuffix?: string; notFoundPage?: string };
      labels?: Record<string, string>;
      retentionPolicy?: { retentionPeriod?: string };
      softDeletePolicy?: { retentionDurationSeconds?: string };
    }
  ) {
    let body: Record<string, any> = {};

    if (params.storageClass) body.storageClass = params.storageClass;
    if (params.enableVersioning !== undefined) {
      body.versioning = { enabled: params.enableVersioning };
    }
    if (params.lifecycle) body.lifecycle = params.lifecycle;
    if (params.website) body.website = params.website;
    if (params.labels) body.labels = params.labels;
    if (params.retentionPolicy) body.retentionPolicy = params.retentionPolicy;
    if (params.softDeletePolicy) body.softDeletePolicy = params.softDeletePolicy;

    let response = await this.api.patch(`/b/${encodeURIComponent(bucketName)}`, body);
    return response.data;
  }

  async deleteBucket(bucketName: string) {
    await this.api.delete(`/b/${encodeURIComponent(bucketName)}`);
  }

  // ── Objects ──

  async listObjects(
    bucketName: string,
    params?: {
      prefix?: string;
      delimiter?: string;
      maxResults?: number;
      pageToken?: string;
      versions?: boolean;
    }
  ) {
    let response = await this.api.get(`/b/${encodeURIComponent(bucketName)}/o`, {
      params: {
        prefix: params?.prefix,
        delimiter: params?.delimiter,
        maxResults: params?.maxResults,
        pageToken: params?.pageToken,
        versions: params?.versions
      }
    });
    return response.data;
  }

  async getObjectMetadata(bucketName: string, objectName: string, generation?: string) {
    let response = await this.api.get(
      `/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectName)}`,
      { params: { generation } }
    );
    return response.data;
  }

  async uploadObject(
    bucketName: string,
    objectName: string,
    content: string,
    params?: {
      contentType?: string;
      metadata?: Record<string, string>;
    }
  ) {
    let contentType = params?.contentType || 'application/octet-stream';

    let metadataBody: Record<string, any> = {
      name: objectName
    };
    if (params?.metadata) {
      metadataBody.metadata = params.metadata;
    }

    let boundary = '===slate_boundary===';
    let multipartBody = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadataBody),
      `--${boundary}`,
      `Content-Type: ${contentType}`,
      '',
      content,
      `--${boundary}--`
    ].join('\r\n');

    let response = await this.uploadApi.post(
      `/b/${encodeURIComponent(bucketName)}/o`,
      multipartBody,
      {
        params: { uploadType: 'multipart' },
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`
        }
      }
    );
    return response.data;
  }

  // With `generation` that version is gone for good; without it, versioned buckets keep a noncurrent copy.
  async deleteObject(
    bucketName: string,
    objectName: string,
    params?: { generation?: string; ifGenerationMatch?: string }
  ) {
    await this.api.delete(
      `/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectName)}`,
      {
        params: {
          ...(params?.generation ? { generation: params.generation } : {}),
          ...(params?.ifGenerationMatch ? { ifGenerationMatch: params.ifGenerationMatch } : {})
        }
      }
    );
  }

  async copyObject(
    sourceBucket: string,
    sourceObject: string,
    destinationBucket: string,
    destinationObject: string,
    metadata?: Record<string, any>,
    params?: { sourceGeneration?: string; ifGenerationMatch?: string }
  ) {
    let response = await this.api.post(
      `/b/${encodeURIComponent(sourceBucket)}/o/${encodeURIComponent(sourceObject)}/copyTo/b/${encodeURIComponent(destinationBucket)}/o/${encodeURIComponent(destinationObject)}`,
      metadata || {},
      { params }
    );
    return response.data;
  }

  async moveObject(
    sourceBucket: string,
    sourceObject: string,
    destinationBucket: string,
    destinationObject: string,
    params?: { sourceGeneration?: string; ifGenerationMatch?: string }
  ) {
    // Pin the source before copy/delete so a concurrent replacement is never deleted.
    const source = await this.getObjectMetadata(
      sourceBucket,
      sourceObject,
      params?.sourceGeneration
    );
    if (typeof source.generation !== 'string' || !/^[1-9]\d*$/.test(source.generation)) {
      throw createApiServiceError(
        'Cloud Storage did not return the source object generation.'
      );
    }
    const resource = await this.copyObject(
      sourceBucket,
      sourceObject,
      destinationBucket,
      destinationObject,
      undefined,
      { ...params, sourceGeneration: source.generation }
    );
    // The precondition deletes the source only while the copied generation is still live.
    try {
      await this.deleteObject(sourceBucket, sourceObject, {
        ifGenerationMatch: source.generation
      });
    } catch (error) {
      if (Number(getApiErrorStatus(error)) !== 412) throw error;
      return { resource, sourceDeleted: false };
    }
    return { resource, sourceDeleted: true };
  }

  async updateObjectMetadata(
    bucketName: string,
    objectName: string,
    metadata: Record<string, any>,
    params?: { generation?: string; ifMetagenerationMatch?: string }
  ) {
    let response = await this.api.patch(
      `/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectName)}`,
      metadata,
      { params }
    );
    return response.data;
  }

  // ── ACLs & IAM ──

  async getBucketIamPolicy(bucketName: string) {
    let response = await this.api.get(`/b/${encodeURIComponent(bucketName)}/iam`);
    return response.data;
  }

  async setBucketIamPolicy(bucketName: string, policy: any) {
    let response = await this.api.put(`/b/${encodeURIComponent(bucketName)}/iam`, policy);
    return response.data;
  }

  async getObjectAcl(bucketName: string, objectName: string) {
    let response = await this.api.get(
      `/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectName)}/acl`
    );
    return response.data;
  }

  // ── Signed URLs ──

  async generateSignedUrl(params: {
    bucketName: string;
    objectName: string;
    expirationSeconds: number;
    method?: string;
    contentType?: string;
  }) {
    let method = params.method || 'GET';
    let now = new Date();
    let expiration = new Date(now.getTime() + params.expirationSeconds * 1000);

    let credentialDate = now.toISOString().replace(/[-:]/g, '').substring(0, 8);
    let credentialScope = `${credentialDate}/auto/storage/goog4_request`;

    let timestamp = now
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');

    let signedHeaders = 'host';
    let host = 'storage.googleapis.com';

    let canonicalQueryString = new URLSearchParams({
      'X-Goog-Algorithm': 'GOOG4-RSA-SHA256',
      'X-Goog-Credential': `${credentialScope}`,
      'X-Goog-Date': timestamp,
      'X-Goog-Expires': params.expirationSeconds.toString(),
      'X-Goog-SignedHeaders': signedHeaders
    }).toString();

    let _canonicalRequest = [
      method,
      `/${encodeURIComponent(params.bucketName)}/${encodeURIComponent(params.objectName)}`,
      canonicalQueryString,
      `host:${host}`,
      '',
      signedHeaders,
      'UNSIGNED-PAYLOAD'
    ].join('\n');

    return {
      url: `https://${host}/${encodeURIComponent(params.bucketName)}/${encodeURIComponent(params.objectName)}`,
      expiresAt: expiration.toISOString(),
      note: 'Full V4 signing requires a private key. Use this with Service Account auth for complete signed URL generation.'
    };
  }

  // ── Notifications ──

  async testBucketPermissions(bucketName: string, permissions: string[]): Promise<string[]> {
    const response = await this.api.get(
      `/b/${encodeURIComponent(bucketName)}/iam/testPermissions`,
      {
        params: { permissions },
        paramsSerializer: { indexes: null }
      }
    );
    if (response.data.permissions === undefined) return [];
    if (
      !Array.isArray(response.data.permissions) ||
      response.data.permissions.some((value: unknown) => typeof value !== 'string')
    )
      throw createApiServiceError('Cloud Storage returned invalid bucket permissions.');
    return response.data.permissions;
  }

  async getNotification(bucketName: string, notificationId: string) {
    const response = await this.api.get(
      `/b/${encodeURIComponent(bucketName)}/notificationConfigs/${encodeURIComponent(notificationId)}`
    );
    return response.data;
  }

  async listNotifications(bucketName: string) {
    let response = await this.api.get(
      `/b/${encodeURIComponent(bucketName)}/notificationConfigs`
    );
    return response.data;
  }

  async createNotification(
    bucketName: string,
    params: {
      topic: string;
      eventTypes?: string[];
      objectNamePrefix?: string;
      payloadFormat?: string;
      customAttributes?: Record<string, string>;
    }
  ) {
    let body: Record<string, any> = {
      topic: params.topic,
      payload_format: params.payloadFormat || 'JSON_API_V1'
    };
    if (params.eventTypes) body.event_types = params.eventTypes;
    if (params.objectNamePrefix) body.object_name_prefix = params.objectNamePrefix;
    if (params.customAttributes) body.custom_attributes = params.customAttributes;

    let response = await this.api.post(
      `/b/${encodeURIComponent(bucketName)}/notificationConfigs`,
      body
    );
    return response.data;
  }

  async deleteNotification(bucketName: string, notificationId: string) {
    await this.api.delete(
      `/b/${encodeURIComponent(bucketName)}/notificationConfigs/${encodeURIComponent(notificationId)}`
    );
  }

  // ── Lifecycle ──

  async getBucketLifecycle(bucketName: string) {
    let response = await this.api.get(`/b/${encodeURIComponent(bucketName)}`, {
      params: { fields: 'lifecycle' }
    });
    return response.data;
  }

  async setBucketLifecycle(bucketName: string, lifecycle: any) {
    let response = await this.api.patch(`/b/${encodeURIComponent(bucketName)}`, {
      lifecycle
    });
    return response.data;
  }

  // ── Object holds and retention ──

  async setObjectHold(
    bucketName: string,
    objectName: string,
    params: {
      temporaryHold?: boolean;
      eventBasedHold?: boolean;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.temporaryHold !== undefined) body.temporaryHold = params.temporaryHold;
    if (params.eventBasedHold !== undefined) body.eventBasedHold = params.eventBasedHold;

    let response = await this.api.patch(
      `/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectName)}`,
      body
    );
    return response.data;
  }
}
