import { Buffer } from 'node:buffer';
import {
  S3Client as AwsS3Client,
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteBucketLifecycleCommand,
  DeleteBucketPolicyCommand,
  DeleteBucketTaggingCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  DeleteObjectTaggingCommand,
  GetBucketLifecycleConfigurationCommand,
  GetBucketLocationCommand,
  GetBucketPolicyCommand,
  GetBucketTaggingCommand,
  GetBucketVersioningCommand,
  GetObjectCommand,
  GetObjectTaggingCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  PutBucketLifecycleConfigurationCommand,
  PutBucketPolicyCommand,
  PutBucketTaggingCommand,
  PutBucketVersioningCommand,
  PutObjectCommand,
  PutObjectTaggingCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createSlatesAwsSdkHttpHandler } from '@slates/aws-sdk-http-handler';
import { s3ApiError } from './errors';

export interface S3ClientConfig {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
}

export interface S3Bucket {
  bucketName: string;
  creationDate: string;
}

export interface S3Object {
  objectKey: string;
  lastModified: string;
  eTag: string;
  sizeBytes: number;
  storageClass: string;
}

export interface S3ObjectMetadata {
  objectKey: string;
  contentType?: string;
  contentLength?: number;
  eTag?: string;
  lastModified?: string;
  storageClass?: string;
  versionId?: string;
  serverSideEncryption?: string;
  metadata: Record<string, string>;
}

export interface ListObjectsResult {
  objects: S3Object[];
  commonPrefixes: string[];
  isTruncated: boolean;
  nextContinuationToken?: string;
  keyCount: number;
}

export interface S3ObjectVersion {
  objectKey: string;
  versionId: string;
  isLatest: boolean;
  lastModified: string;
  eTag: string;
  sizeBytes: number;
  storageClass: string;
  isDeleteMarker: boolean;
}

export interface ListVersionsResult {
  versions: S3ObjectVersion[];
  isTruncated: boolean;
  nextKeyMarker?: string;
  nextVersionIdMarker?: string;
}

export interface S3Tag {
  key: string;
  value: string;
}

export type S3LifecycleRuleStatus = 'Enabled' | 'Disabled';

export type S3LifecycleTransitionStorageClass =
  | 'GLACIER'
  | 'STANDARD_IA'
  | 'ONEZONE_IA'
  | 'INTELLIGENT_TIERING'
  | 'DEEP_ARCHIVE'
  | 'GLACIER_IR';

export interface S3LifecycleExpiration {
  date?: string;
  days?: number;
  expiredObjectDeleteMarker?: boolean;
}

export interface S3LifecycleTransition {
  date?: string;
  days?: number;
  storageClass: S3LifecycleTransitionStorageClass;
}

export interface S3NoncurrentVersionExpiration {
  noncurrentDays?: number;
  newerNoncurrentVersions?: number;
}

export interface S3NoncurrentVersionTransition {
  noncurrentDays?: number;
  newerNoncurrentVersions?: number;
  storageClass: S3LifecycleTransitionStorageClass;
}

export interface S3LifecycleRule {
  id?: string;
  status: S3LifecycleRuleStatus;
  prefix?: string;
  tagFilters?: S3Tag[];
  objectSizeGreaterThan?: number;
  objectSizeLessThan?: number;
  expiration?: S3LifecycleExpiration;
  transitions?: S3LifecycleTransition[];
  noncurrentVersionExpiration?: S3NoncurrentVersionExpiration;
  noncurrentVersionTransitions?: S3NoncurrentVersionTransition[];
  abortIncompleteMultipartUploadDays?: number;
}

let isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null;

let withoutUndefined = <T extends Record<string, any>>(input: T): T => {
  let out: Record<string, any> = {};

  for (let [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }

  return out as T;
};

let dateToString = (value: unknown): string | undefined => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.length > 0) return value;
  return undefined;
};

let parseDate = (value: string | undefined) => (value ? new Date(value) : undefined);

let stripEtag = (value: string | undefined) => value?.replace(/"/g, '') || '';

let toSdkTag = (tag: S3Tag) => ({
  Key: tag.key,
  Value: tag.value
});

let fromSdkTag = (tag: { Key?: string; Value?: string }): S3Tag => ({
  key: tag.Key || '',
  value: tag.Value || ''
});

let getSdkStatus = (error: unknown) => {
  if (!isRecord(error)) return undefined;
  let metadata = isRecord(error.$metadata) ? error.$metadata : undefined;
  let status = metadata?.httpStatusCode ?? error.statusCode ?? error.status;
  return typeof status === 'number' ? status : undefined;
};

let getSdkCode = (error: unknown) => {
  if (!isRecord(error)) return undefined;
  if (typeof error.Code === 'string') return error.Code;
  if (typeof error.code === 'string' && !error.code.startsWith('upstream.')) {
    return error.code;
  }
  if (typeof error.name === 'string' && error.name !== 'Error') return error.name;
  return undefined;
};

let getSdkMessage = (error: unknown) => {
  if (!isRecord(error)) {
    return error instanceof Error ? error.message : String(error);
  }

  return (
    (typeof error.message === 'string' && error.message) ||
    (typeof error.Message === 'string' && error.Message) ||
    (typeof error.Code === 'string' && error.Code) ||
    'Unknown error'
  );
};

let bodyToString = async (body: any): Promise<string> => {
  if (body === undefined || body === null) return '';
  if (typeof body === 'string') return body;
  if (body instanceof Uint8Array) return Buffer.from(body).toString('utf8');
  if (typeof body.transformToString === 'function') return await body.transformToString();
  if (typeof body.text === 'function') return await body.text();

  if (typeof body[Symbol.asyncIterator] === 'function') {
    let chunks: Buffer[] = [];
    for await (let chunk of body as AsyncIterable<Uint8Array | string>) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
  }

  return String(body);
};

let encodeCopySource = (bucket: string, key: string, versionId?: string) => {
  let source = `${bucket}/${encodeObjectKey(key)}`;
  return versionId ? `${source}?versionId=${encodeURIComponent(versionId)}` : source;
};

let encodeObjectKey = (key: string): string => {
  return key
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
};

let metadataFromObjectResponse = (key: string, response: Record<string, any>) => ({
  objectKey: key,
  contentType: response.ContentType,
  contentLength: response.ContentLength,
  eTag: stripEtag(response.ETag) || undefined,
  lastModified: dateToString(response.LastModified),
  storageClass: response.StorageClass,
  versionId: response.VersionId,
  serverSideEncryption: response.ServerSideEncryption,
  metadata: response.Metadata || {}
});

let buildLifecycleFilter = (rule: S3LifecycleRule) => {
  let tags = (rule.tagFilters || []).map(toSdkTag);
  let hasPrefix = rule.prefix !== undefined;
  let hasGreaterThan = rule.objectSizeGreaterThan !== undefined;
  let hasLessThan = rule.objectSizeLessThan !== undefined;
  let filterParts =
    (hasPrefix ? 1 : 0) + tags.length + (hasGreaterThan ? 1 : 0) + (hasLessThan ? 1 : 0);

  if (filterParts === 0) {
    return { Prefix: '' };
  }

  if (filterParts === 1) {
    if (hasPrefix) return { Prefix: rule.prefix };
    if (tags[0]) return { Tag: tags[0] };
    if (hasGreaterThan) return { ObjectSizeGreaterThan: rule.objectSizeGreaterThan };
    return { ObjectSizeLessThan: rule.objectSizeLessThan };
  }

  return {
    And: withoutUndefined({
      Prefix: rule.prefix,
      Tags: tags.length > 0 ? tags : undefined,
      ObjectSizeGreaterThan: rule.objectSizeGreaterThan,
      ObjectSizeLessThan: rule.objectSizeLessThan
    })
  };
};

let parseLifecycleFilter = (
  rule: Record<string, any>
): {
  prefix?: string;
  tagFilters?: S3Tag[];
  objectSizeGreaterThan?: number;
  objectSizeLessThan?: number;
} => {
  let filter = rule.Filter || {};

  if (filter.And) {
    return {
      prefix: filter.And.Prefix,
      tagFilters: filter.And.Tags?.map(fromSdkTag),
      objectSizeGreaterThan: filter.And.ObjectSizeGreaterThan,
      objectSizeLessThan: filter.And.ObjectSizeLessThan
    };
  }

  return {
    prefix: filter.Prefix ?? rule.Prefix,
    tagFilters: filter.Tag ? [fromSdkTag(filter.Tag)] : undefined,
    objectSizeGreaterThan: filter.ObjectSizeGreaterThan,
    objectSizeLessThan: filter.ObjectSizeLessThan
  };
};

let toSdkLifecycleRule = (rule: S3LifecycleRule) =>
  withoutUndefined({
    ID: rule.id,
    Status: rule.status,
    Filter: buildLifecycleFilter(rule),
    Expiration: rule.expiration
      ? withoutUndefined({
          Date: parseDate(rule.expiration.date),
          Days: rule.expiration.days,
          ExpiredObjectDeleteMarker: rule.expiration.expiredObjectDeleteMarker
        })
      : undefined,
    Transitions:
      rule.transitions && rule.transitions.length > 0
        ? rule.transitions.map(transition =>
            withoutUndefined({
              Date: parseDate(transition.date),
              Days: transition.days,
              StorageClass: transition.storageClass
            })
          )
        : undefined,
    NoncurrentVersionExpiration: rule.noncurrentVersionExpiration
      ? withoutUndefined({
          NoncurrentDays: rule.noncurrentVersionExpiration.noncurrentDays,
          NewerNoncurrentVersions: rule.noncurrentVersionExpiration.newerNoncurrentVersions
        })
      : undefined,
    NoncurrentVersionTransitions:
      rule.noncurrentVersionTransitions && rule.noncurrentVersionTransitions.length > 0
        ? rule.noncurrentVersionTransitions.map(transition =>
            withoutUndefined({
              NoncurrentDays: transition.noncurrentDays,
              NewerNoncurrentVersions: transition.newerNoncurrentVersions,
              StorageClass: transition.storageClass
            })
          )
        : undefined,
    AbortIncompleteMultipartUpload:
      rule.abortIncompleteMultipartUploadDays !== undefined
        ? { DaysAfterInitiation: rule.abortIncompleteMultipartUploadDays }
        : undefined
  });

let fromSdkLifecycleRule = (rule: Record<string, any>): S3LifecycleRule => {
  let filter = parseLifecycleFilter(rule);

  return {
    id: rule.ID,
    status: rule.Status === 'Enabled' || rule.Status === 'Disabled' ? rule.Status : 'Disabled',
    ...filter,
    expiration: rule.Expiration
      ? {
          date: dateToString(rule.Expiration.Date),
          days: rule.Expiration.Days,
          expiredObjectDeleteMarker: rule.Expiration.ExpiredObjectDeleteMarker
        }
      : undefined,
    transitions: (rule.Transitions || []).map((transition: Record<string, any>) => ({
      date: dateToString(transition.Date),
      days: transition.Days,
      storageClass: (transition.StorageClass || 'GLACIER') as S3LifecycleTransitionStorageClass
    })),
    noncurrentVersionExpiration: rule.NoncurrentVersionExpiration
      ? {
          noncurrentDays: rule.NoncurrentVersionExpiration.NoncurrentDays,
          newerNoncurrentVersions: rule.NoncurrentVersionExpiration.NewerNoncurrentVersions
        }
      : undefined,
    noncurrentVersionTransitions: (rule.NoncurrentVersionTransitions || []).map(
      (transition: Record<string, any>) => ({
        noncurrentDays: transition.NoncurrentDays,
        newerNoncurrentVersions: transition.NewerNoncurrentVersions,
        storageClass: (transition.StorageClass ||
          'GLACIER') as S3LifecycleTransitionStorageClass
      })
    ),
    abortIncompleteMultipartUploadDays:
      rule.AbortIncompleteMultipartUpload?.DaysAfterInitiation
  };
};

export class S3Client {
  private client: AwsS3Client;

  constructor(config: S3ClientConfig) {
    this.client = new AwsS3Client({
      region: config.region,
      credentials: withoutUndefined({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        sessionToken: config.sessionToken || undefined
      }),
      requestHandler: createSlatesAwsSdkHttpHandler()
    });
  }

  private async send<T>(operation: string, command: any): Promise<T> {
    try {
      return (await this.client.send(command)) as T;
    } catch (error) {
      throw s3ApiError({
        operation,
        status: getSdkStatus(error),
        code: getSdkCode(error),
        message: getSdkMessage(error),
        parent: error
      });
    }
  }

  // === Bucket Operations ===

  async listBuckets(): Promise<S3Bucket[]> {
    let response: any = await this.send('ListBuckets', new ListBucketsCommand({}));

    return (response.Buckets || []).map((bucket: any) => ({
      bucketName: bucket.Name || '',
      creationDate: dateToString(bucket.CreationDate) || ''
    }));
  }

  async createBucket(bucket: string, locationConstraint?: string): Promise<void> {
    let region = locationConstraint || (await this.client.config.region());

    await this.send(
      'CreateBucket',
      new CreateBucketCommand(
        withoutUndefined({
          Bucket: bucket,
          CreateBucketConfiguration:
            region === 'us-east-1' ? undefined : { LocationConstraint: region }
        }) as any
      )
    );
  }

  async deleteBucket(bucket: string): Promise<void> {
    await this.send('DeleteBucket', new DeleteBucketCommand({ Bucket: bucket }));
  }

  async getBucketLocation(bucket: string): Promise<string> {
    let response: any = await this.send(
      'GetBucketLocation',
      new GetBucketLocationCommand({ Bucket: bucket })
    );

    return response.LocationConstraint || 'us-east-1';
  }

  // === Object Operations ===

  async listObjects(
    bucket: string,
    options?: {
      prefix?: string;
      delimiter?: string;
      maxKeys?: number;
      continuationToken?: string;
      startAfter?: string;
    }
  ): Promise<ListObjectsResult> {
    let response: any = await this.send(
      'ListObjectsV2',
      new ListObjectsV2Command(
        withoutUndefined({
          Bucket: bucket,
          Prefix: options?.prefix,
          Delimiter: options?.delimiter,
          MaxKeys: options?.maxKeys,
          ContinuationToken: options?.continuationToken,
          StartAfter: options?.startAfter
        })
      )
    );

    return {
      objects: (response.Contents || []).map((object: any) => ({
        objectKey: object.Key || '',
        lastModified: dateToString(object.LastModified) || '',
        eTag: stripEtag(object.ETag),
        sizeBytes: object.Size || 0,
        storageClass: object.StorageClass || 'STANDARD'
      })),
      commonPrefixes: (response.CommonPrefixes || []).map(
        (prefix: any) => prefix.Prefix || ''
      ),
      isTruncated: response.IsTruncated === true,
      nextContinuationToken: response.NextContinuationToken,
      keyCount: response.KeyCount || 0
    };
  }

  async getObject(
    bucket: string,
    key: string,
    options?: {
      versionId?: string;
      range?: string;
    }
  ): Promise<{ content: string; metadata: S3ObjectMetadata }> {
    let response: any = await this.send(
      'GetObject',
      new GetObjectCommand(
        withoutUndefined({
          Bucket: bucket,
          Key: key,
          VersionId: options?.versionId,
          Range: options?.range
        })
      )
    );

    return {
      content: await bodyToString(response.Body),
      metadata: metadataFromObjectResponse(key, response)
    };
  }

  async headObject(
    bucket: string,
    key: string,
    versionId?: string
  ): Promise<S3ObjectMetadata> {
    let response: any = await this.send(
      'HeadObject',
      new HeadObjectCommand(
        withoutUndefined({
          Bucket: bucket,
          Key: key,
          VersionId: versionId
        })
      )
    );

    return metadataFromObjectResponse(key, response);
  }

  async putObject(
    bucket: string,
    key: string,
    body: string,
    options?: {
      contentType?: string;
      metadata?: Record<string, string>;
      storageClass?: string;
      serverSideEncryption?: string;
      tagging?: string;
      acl?: string;
    }
  ): Promise<{ eTag: string; versionId?: string }> {
    let response: any = await this.send(
      'PutObject',
      new PutObjectCommand(
        withoutUndefined({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: options?.contentType,
          Metadata: options?.metadata,
          StorageClass: options?.storageClass,
          ServerSideEncryption: options?.serverSideEncryption,
          Tagging: options?.tagging,
          ACL: options?.acl
        }) as any
      )
    );

    return {
      eTag: stripEtag(response.ETag),
      versionId: response.VersionId
    };
  }

  async deleteObject(
    bucket: string,
    key: string,
    versionId?: string
  ): Promise<{ deleteMarker?: boolean; versionId?: string }> {
    let response: any = await this.send(
      'DeleteObject',
      new DeleteObjectCommand(
        withoutUndefined({
          Bucket: bucket,
          Key: key,
          VersionId: versionId
        })
      )
    );

    return {
      deleteMarker: response.DeleteMarker,
      versionId: response.VersionId
    };
  }

  async deleteObjects(
    bucket: string,
    keys: Array<{ objectKey: string; versionId?: string }>
  ): Promise<{
    deleted: Array<{ objectKey: string; versionId?: string }>;
    errors: Array<{ objectKey: string; code: string; message: string }>;
  }> {
    let response: any = await this.send(
      'DeleteObjects',
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Quiet: false,
          Objects: keys.map(object =>
            withoutUndefined({
              Key: object.objectKey,
              VersionId: object.versionId
            })
          )
        }
      })
    );

    return {
      deleted: (response.Deleted || []).map((object: any) => ({
        objectKey: object.Key || '',
        versionId: object.VersionId
      })),
      errors: (response.Errors || []).map((error: any) => ({
        objectKey: error.Key || '',
        code: error.Code || '',
        message: error.Message || ''
      }))
    };
  }

  async copyObject(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string,
    options?: {
      metadataDirective?: 'COPY' | 'REPLACE';
      metadata?: Record<string, string>;
      contentType?: string;
      storageClass?: string;
      serverSideEncryption?: string;
      sourceVersionId?: string;
    }
  ): Promise<{ eTag: string; lastModified: string; versionId?: string }> {
    let response: any = await this.send(
      'CopyObject',
      new CopyObjectCommand(
        withoutUndefined({
          Bucket: destBucket,
          Key: destKey,
          CopySource: encodeCopySource(sourceBucket, sourceKey, options?.sourceVersionId),
          MetadataDirective: options?.metadataDirective,
          Metadata: options?.metadata,
          ContentType: options?.contentType,
          StorageClass: options?.storageClass,
          ServerSideEncryption: options?.serverSideEncryption
        }) as any
      )
    );

    return {
      eTag: stripEtag(response.CopyObjectResult?.ETag),
      lastModified: dateToString(response.CopyObjectResult?.LastModified) || '',
      versionId: response.VersionId
    };
  }

  // === Presigned URLs ===

  async generatePresignedUrl(
    bucket: string,
    key: string,
    options?: {
      method?: string;
      expiresInSeconds?: number;
      versionId?: string;
      contentType?: string;
    }
  ): Promise<string> {
    let method = options?.method || 'GET';
    let command =
      method === 'PUT'
        ? new PutObjectCommand(
            withoutUndefined({
              Bucket: bucket,
              Key: key,
              ContentType: options?.contentType
            })
          )
        : new GetObjectCommand(
            withoutUndefined({
              Bucket: bucket,
              Key: key,
              VersionId: options?.versionId
            })
          );

    return await getSignedUrl(this.client, command, {
      expiresIn: options?.expiresInSeconds || 3600
    });
  }

  // === Versioning ===

  async getBucketVersioning(bucket: string): Promise<{ status: string; mfaDelete?: string }> {
    let response: any = await this.send(
      'GetBucketVersioning',
      new GetBucketVersioningCommand({ Bucket: bucket })
    );

    return {
      status: response.Status || 'Disabled',
      mfaDelete: response.MFADelete
    };
  }

  async putBucketVersioning(bucket: string, status: 'Enabled' | 'Suspended'): Promise<void> {
    await this.send(
      'PutBucketVersioning',
      new PutBucketVersioningCommand({
        Bucket: bucket,
        VersioningConfiguration: {
          Status: status
        }
      })
    );
  }

  async listObjectVersions(
    bucket: string,
    options?: {
      prefix?: string;
      maxKeys?: number;
      keyMarker?: string;
      versionIdMarker?: string;
    }
  ): Promise<ListVersionsResult> {
    let response: any = await this.send(
      'ListObjectVersions',
      new ListObjectVersionsCommand(
        withoutUndefined({
          Bucket: bucket,
          Prefix: options?.prefix,
          MaxKeys: options?.maxKeys,
          KeyMarker: options?.keyMarker,
          VersionIdMarker: options?.versionIdMarker
        })
      )
    );

    let versions: S3ObjectVersion[] = (response.Versions || []).map((version: any) => ({
      objectKey: version.Key || '',
      versionId: version.VersionId || '',
      isLatest: version.IsLatest === true,
      lastModified: dateToString(version.LastModified) || '',
      eTag: stripEtag(version.ETag),
      sizeBytes: version.Size || 0,
      storageClass: version.StorageClass || 'STANDARD',
      isDeleteMarker: false
    }));

    let deleteMarkers: S3ObjectVersion[] = (response.DeleteMarkers || []).map(
      (marker: any) => ({
        objectKey: marker.Key || '',
        versionId: marker.VersionId || '',
        isLatest: marker.IsLatest === true,
        lastModified: dateToString(marker.LastModified) || '',
        eTag: '',
        sizeBytes: 0,
        storageClass: '',
        isDeleteMarker: true
      })
    );

    return {
      versions: [...versions, ...deleteMarkers].sort((a, b) =>
        b.lastModified.localeCompare(a.lastModified)
      ),
      isTruncated: response.IsTruncated === true,
      nextKeyMarker: response.NextKeyMarker,
      nextVersionIdMarker: response.NextVersionIdMarker
    };
  }

  // === Tags ===

  async getObjectTagging(bucket: string, key: string, versionId?: string): Promise<S3Tag[]> {
    let response: any = await this.send(
      'GetObjectTagging',
      new GetObjectTaggingCommand(
        withoutUndefined({
          Bucket: bucket,
          Key: key,
          VersionId: versionId
        })
      )
    );

    return (response.TagSet || []).map(fromSdkTag);
  }

  async putObjectTagging(
    bucket: string,
    key: string,
    tags: S3Tag[],
    versionId?: string
  ): Promise<void> {
    await this.send(
      'PutObjectTagging',
      new PutObjectTaggingCommand(
        withoutUndefined({
          Bucket: bucket,
          Key: key,
          VersionId: versionId,
          Tagging: {
            TagSet: tags.map(toSdkTag)
          }
        })
      )
    );
  }

  async deleteObjectTagging(bucket: string, key: string, versionId?: string): Promise<void> {
    await this.send(
      'DeleteObjectTagging',
      new DeleteObjectTaggingCommand(
        withoutUndefined({
          Bucket: bucket,
          Key: key,
          VersionId: versionId
        })
      )
    );
  }

  async getBucketTagging(bucket: string): Promise<S3Tag[]> {
    let response: any = await this.send(
      'GetBucketTagging',
      new GetBucketTaggingCommand({ Bucket: bucket })
    );

    return (response.TagSet || []).map(fromSdkTag);
  }

  async putBucketTagging(bucket: string, tags: S3Tag[]): Promise<void> {
    await this.send(
      'PutBucketTagging',
      new PutBucketTaggingCommand({
        Bucket: bucket,
        Tagging: {
          TagSet: tags.map(toSdkTag)
        }
      })
    );
  }

  async deleteBucketTagging(bucket: string): Promise<void> {
    await this.send('DeleteBucketTagging', new DeleteBucketTaggingCommand({ Bucket: bucket }));
  }

  // === Bucket Policy ===

  async getBucketPolicy(bucket: string): Promise<string> {
    let response: any = await this.send(
      'GetBucketPolicy',
      new GetBucketPolicyCommand({ Bucket: bucket })
    );

    return response.Policy || '';
  }

  async putBucketPolicy(bucket: string, policy: string): Promise<void> {
    await this.send(
      'PutBucketPolicy',
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: policy
      })
    );
  }

  async deleteBucketPolicy(bucket: string): Promise<void> {
    await this.send('DeleteBucketPolicy', new DeleteBucketPolicyCommand({ Bucket: bucket }));
  }

  // === Bucket Lifecycle ===

  async getBucketLifecycle(bucket: string): Promise<S3LifecycleRule[]> {
    let response: any = await this.send(
      'GetBucketLifecycleConfiguration',
      new GetBucketLifecycleConfigurationCommand({ Bucket: bucket })
    );

    return (response.Rules || []).map(fromSdkLifecycleRule);
  }

  async putBucketLifecycle(bucket: string, rules: S3LifecycleRule[]): Promise<void> {
    await this.send(
      'PutBucketLifecycleConfiguration',
      new PutBucketLifecycleConfigurationCommand({
        Bucket: bucket,
        LifecycleConfiguration: {
          Rules: rules.map(toSdkLifecycleRule)
        }
      } as any)
    );
  }

  async deleteBucketLifecycle(bucket: string): Promise<void> {
    await this.send(
      'DeleteBucketLifecycle',
      new DeleteBucketLifecycleCommand({ Bucket: bucket })
    );
  }
}
