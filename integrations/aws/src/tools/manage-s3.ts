import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { awsServiceError } from '../lib/errors';
import { clientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let bucketSchema = z.object({
  name: z.string().describe('Bucket name'),
  creationDate: z.string().optional().describe('Bucket creation date')
});

let objectSchema = z.object({
  key: z.string().describe('Object key (path)'),
  size: z.number().optional().describe('Object size in bytes'),
  lastModified: z.string().optional().describe('Last modified timestamp'),
  storageClass: z
    .string()
    .optional()
    .describe('Storage class (STANDARD, INTELLIGENT_TIERING, etc.)'),
  etag: z.string().optional().describe('Entity tag (hash of the object)')
});

let objectMetadataSchema = z.object({
  key: z.string().describe('Object key'),
  bucket: z.string().describe('Bucket name'),
  contentType: z.string().optional().describe('MIME content type'),
  contentLength: z.number().optional().describe('Size in bytes'),
  lastModified: z.string().optional().describe('Last modified timestamp'),
  etag: z.string().optional().describe('Entity tag'),
  storageClass: z.string().optional().describe('Storage class'),
  serverSideEncryption: z.string().optional().describe('Server-side encryption algorithm'),
  versionId: z.string().optional().describe('Version ID if versioning is enabled'),
  metadata: z.record(z.string(), z.string()).optional().describe('User-defined metadata')
});

let outputSchema = z.object({
  operation: z.string().describe('The operation that was performed'),
  buckets: z.array(bucketSchema).optional().describe('List of buckets (for list_buckets)'),
  objects: z.array(objectSchema).optional().describe('List of objects (for list_objects)'),
  objectMetadata: objectMetadataSchema
    .optional()
    .describe('Object metadata (for get_object_metadata)'),
  bucket: z.string().optional().describe('Bucket name involved in the operation'),
  key: z.string().optional().describe('Object key involved in the operation'),
  isTruncated: z
    .boolean()
    .optional()
    .describe('Whether the list results are truncated (more results available)'),
  nextContinuationToken: z
    .string()
    .optional()
    .describe('Token to retrieve the next page of list results'),
  commonPrefixes: z
    .array(z.string())
    .optional()
    .describe('Common prefixes when using a delimiter (virtual folders)'),
  copySourceBucket: z.string().optional().describe('Source bucket for copy operations'),
  copySourceKey: z.string().optional().describe('Source key for copy operations')
});

let encodeCopySource = (bucket: string, key: string) =>
  `${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;

export let manageS3Tool = SlateTool.create(spec, {
  name: 'Manage S3',
  key: 'manage_s3',
  description: `Manage Amazon S3 buckets and objects. Supports listing buckets, creating and deleting buckets, listing objects within a bucket, retrieving object metadata, deleting objects, and copying objects between locations. This tool covers S3 management operations — it does not handle binary upload or download.`,
  instructions: [
    'Use operation "list_buckets" to list all S3 buckets in the account.',
    'Use operation "create_bucket" to create a new bucket. Provide "bucket" name. The bucket is created in the configured region.',
    'Use operation "delete_bucket" to delete an empty bucket. The bucket must be empty before deletion.',
    'Use operation "list_objects" to list objects in a bucket. Provide "bucket" and optionally "prefix", "delimiter", "maxKeys", and "continuationToken" for pagination.',
    'Use operation "get_object_metadata" to get metadata for a specific object. Provide "bucket" and "key".',
    'Use operation "delete_object" to delete a specific object. Provide "bucket" and "key".',
    'Use operation "copy_object" to copy an object. Provide "sourceBucket", "sourceKey", "destinationBucket", and "destinationKey".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum([
          'list_buckets',
          'create_bucket',
          'delete_bucket',
          'list_objects',
          'get_object_metadata',
          'delete_object',
          'copy_object'
        ])
        .describe('The S3 operation to perform'),
      bucket: z
        .string()
        .optional()
        .describe(
          'Bucket name (required for most operations except list_buckets and copy_object)'
        ),
      key: z
        .string()
        .optional()
        .describe('Object key / path (required for get_object_metadata, delete_object)'),
      prefix: z
        .string()
        .optional()
        .describe('Filter objects by key prefix (for list_objects)'),
      delimiter: z
        .string()
        .optional()
        .describe(
          'Delimiter for grouping keys into common prefixes, typically "/" (for list_objects)'
        ),
      maxKeys: z
        .number()
        .optional()
        .describe(
          'Maximum number of objects to return, up to 1000 (for list_objects, default: 1000)'
        ),
      continuationToken: z
        .string()
        .optional()
        .describe('Continuation token from a previous list_objects response for pagination'),
      sourceBucket: z
        .string()
        .optional()
        .describe('Source bucket name (required for copy_object)'),
      sourceKey: z
        .string()
        .optional()
        .describe('Source object key (required for copy_object)'),
      destinationBucket: z
        .string()
        .optional()
        .describe('Destination bucket name (required for copy_object)'),
      destinationKey: z
        .string()
        .optional()
        .describe('Destination object key (required for copy_object)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = clientFromContext(ctx);
    let { operation } = ctx.input;

    if (operation === 'list_buckets') {
      let response = await client.send('S3 ListBuckets', () =>
        client.s3.send(new ListBucketsCommand({}))
      );
      let buckets = (response.Buckets ?? []).map(bucket => ({
        name: bucket.Name ?? '',
        creationDate: bucket.CreationDate?.toISOString()
      }));

      return {
        output: {
          operation: 'list_buckets',
          buckets
        },
        message: `Found **${buckets.length}** S3 bucket(s).`
      };
    }

    if (operation === 'create_bucket') {
      if (!ctx.input.bucket) throw awsServiceError('bucket is required for create_bucket');

      let bucketName = ctx.input.bucket;
      let region = ctx.config.region;

      await client.send('S3 CreateBucket', () =>
        client.s3.send(
          new CreateBucketCommand({
            Bucket: bucketName,
            ...(region && region !== 'us-east-1'
              ? {
                  CreateBucketConfiguration: {
                    LocationConstraint: region as any
                  }
                }
              : {})
          })
        )
      );

      return {
        output: {
          operation: 'create_bucket',
          bucket: bucketName
        },
        message: `Created bucket **${bucketName}** in region **${region}**.`
      };
    }

    if (operation === 'delete_bucket') {
      if (!ctx.input.bucket) throw awsServiceError('bucket is required for delete_bucket');

      let bucketName = ctx.input.bucket;

      await client.send('S3 DeleteBucket', () =>
        client.s3.send(new DeleteBucketCommand({ Bucket: bucketName }))
      );

      return {
        output: {
          operation: 'delete_bucket',
          bucket: bucketName
        },
        message: `Deleted bucket **${bucketName}**.`
      };
    }

    if (operation === 'list_objects') {
      if (!ctx.input.bucket) throw awsServiceError('bucket is required for list_objects');

      let bucketName = ctx.input.bucket;
      let response = await client.send('S3 ListObjectsV2', () =>
        client.s3.send(
          new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: ctx.input.prefix,
            Delimiter: ctx.input.delimiter,
            MaxKeys: ctx.input.maxKeys,
            ContinuationToken: ctx.input.continuationToken
          })
        )
      );

      let objects = (response.Contents ?? []).map(object => ({
        key: object.Key ?? '',
        size: object.Size,
        lastModified: object.LastModified?.toISOString(),
        storageClass: object.StorageClass,
        etag: object.ETag
      }));
      let commonPrefixes = (response.CommonPrefixes ?? [])
        .map(prefix => prefix.Prefix)
        .filter((prefix): prefix is string => typeof prefix === 'string');

      let prefixLabel = ctx.input.prefix ? ` with prefix "${ctx.input.prefix}"` : '';
      let truncatedLabel = response.IsTruncated ? ' (more results available)' : '';

      return {
        output: {
          operation: 'list_objects',
          bucket: bucketName,
          objects,
          isTruncated: response.IsTruncated ?? false,
          nextContinuationToken: response.IsTruncated
            ? response.NextContinuationToken
            : undefined,
          commonPrefixes: commonPrefixes.length > 0 ? commonPrefixes : undefined
        },
        message: `Found **${objects.length}** object(s) in bucket **${bucketName}**${prefixLabel}${truncatedLabel}.${commonPrefixes.length > 0 ? ` Also found **${commonPrefixes.length}** common prefix(es).` : ''}`
      };
    }

    if (operation === 'get_object_metadata') {
      if (!ctx.input.bucket)
        throw awsServiceError('bucket is required for get_object_metadata');
      if (!ctx.input.key) throw awsServiceError('key is required for get_object_metadata');

      let bucketName = ctx.input.bucket;
      let objectKey = ctx.input.key;
      let response = await client.send('S3 HeadObject', () =>
        client.s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: objectKey }))
      );

      let metadata = {
        key: objectKey,
        bucket: bucketName,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified?.toISOString(),
        etag: response.ETag,
        storageClass: response.StorageClass,
        serverSideEncryption: response.ServerSideEncryption,
        versionId: response.VersionId,
        metadata:
          response.Metadata && Object.keys(response.Metadata).length > 0
            ? response.Metadata
            : undefined
      };

      let sizeLabel = response.ContentLength
        ? ` (${formatBytes(response.ContentLength)})`
        : '';

      return {
        output: {
          operation: 'get_object_metadata',
          bucket: bucketName,
          key: objectKey,
          objectMetadata: metadata
        },
        message: `Retrieved metadata for **${objectKey}** in bucket **${bucketName}**${sizeLabel}.`
      };
    }

    if (operation === 'delete_object') {
      if (!ctx.input.bucket) throw awsServiceError('bucket is required for delete_object');
      if (!ctx.input.key) throw awsServiceError('key is required for delete_object');

      let bucketName = ctx.input.bucket;
      let objectKey = ctx.input.key;

      await client.send('S3 DeleteObject', () =>
        client.s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: objectKey }))
      );

      return {
        output: {
          operation: 'delete_object',
          bucket: bucketName,
          key: objectKey
        },
        message: `Deleted object **${objectKey}** from bucket **${bucketName}**.`
      };
    }

    if (operation === 'copy_object') {
      if (!ctx.input.sourceBucket)
        throw awsServiceError('sourceBucket is required for copy_object');
      if (!ctx.input.sourceKey) throw awsServiceError('sourceKey is required for copy_object');
      if (!ctx.input.destinationBucket)
        throw awsServiceError('destinationBucket is required for copy_object');
      if (!ctx.input.destinationKey)
        throw awsServiceError('destinationKey is required for copy_object');

      let sourceBucket = ctx.input.sourceBucket;
      let sourceKey = ctx.input.sourceKey;
      let destinationBucket = ctx.input.destinationBucket;
      let destinationKey = ctx.input.destinationKey;

      await client.send('S3 CopyObject', () =>
        client.s3.send(
          new CopyObjectCommand({
            Bucket: destinationBucket,
            Key: destinationKey,
            CopySource: encodeCopySource(sourceBucket, sourceKey)
          })
        )
      );

      let sameLocation = sourceBucket === destinationBucket && sourceKey === destinationKey;
      let locationDesc =
        sourceBucket === destinationBucket
          ? `within bucket **${sourceBucket}**`
          : `from **${sourceBucket}** to **${destinationBucket}**`;

      return {
        output: {
          operation: 'copy_object',
          bucket: destinationBucket,
          key: destinationKey,
          copySourceBucket: sourceBucket,
          copySourceKey: sourceKey
        },
        message: sameLocation
          ? `Copied object **${sourceKey}** onto itself in bucket **${sourceBucket}** (metadata refresh).`
          : `Copied **${sourceKey}** ${locationDesc} as **${destinationKey}**.`
      };
    }

    throw awsServiceError(`Unknown operation: ${operation}`);
  })
  .build();

let formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  let units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = Math.floor(Math.log(bytes) / Math.log(1024));
  let value = bytes / 1024 ** i;
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};
