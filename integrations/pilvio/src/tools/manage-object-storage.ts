import { SlateTool } from 'slates';
import { z } from 'zod';
import { PilvioClient } from '../lib/client';
import { spec } from '../spec';

let bucketSchema = z.object({
  name: z.string().describe('Bucket name'),
  sizeBytes: z.number().optional().describe('Total size in bytes'),
  numObjects: z.number().optional().describe('Number of objects in the bucket'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let manageObjectStorage = SlateTool.create(spec, {
  name: 'Manage Object Storage',
  key: 'manage_object_storage',
  description: `Manage S3-compatible object storage buckets: create, list, get info, update billing, or delete buckets. Bucket contents are accessed via the standard S3 API using the S3 endpoint URL.`,
  instructions: [
    'Use "list" to view all buckets.',
    'Use "get" to retrieve details and stats for a specific bucket.',
    'Use "create" to create a new bucket (names must be globally unique).',
    'Use "modify" to change the billing account for a bucket.',
    'Use "delete" to remove an empty bucket.',
    'Use "get_s3_endpoint" to retrieve the S3 API endpoint URL for direct S3 access.'
  ],
  constraints: [
    'Bucket names must be globally unique.',
    'Only empty buckets can be deleted via this API.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'modify', 'delete', 'get_s3_endpoint'])
        .describe('Operation to perform'),
      bucketName: z
        .string()
        .optional()
        .describe('Bucket name (required for get, create, modify, delete)'),
      billingAccountId: z
        .number()
        .optional()
        .describe('Billing account ID (for create/modify)')
    })
  )
  .output(
    z.object({
      bucket: bucketSchema.optional().describe('Bucket details'),
      buckets: z.array(bucketSchema).optional().describe('List of buckets'),
      s3Endpoint: z.string().optional().describe('S3 API endpoint URL'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PilvioClient({
      token: ctx.auth.token,
      locationSlug: ctx.config.locationSlug
    });

    let { action } = ctx.input;

    let mapBucket = (b: any) => ({
      name: b.name,
      sizeBytes: b.size_bytes,
      numObjects: b.num_objects,
      createdAt: b.created_at
    });

    switch (action) {
      case 'list': {
        let buckets = await client.listBuckets(ctx.input.billingAccountId);
        let mapped = (Array.isArray(buckets) ? buckets : []).map(mapBucket);
        return {
          output: { buckets: mapped, success: true },
          message: `Found **${mapped.length}** bucket(s).`
        };
      }

      case 'get': {
        if (!ctx.input.bucketName) throw new Error('bucketName is required for get action');
        let bucket = await client.getBucket(ctx.input.bucketName);
        return {
          output: { bucket: mapBucket(bucket), success: true },
          message: `Bucket **${bucket.name}**: ${bucket.num_objects || 0} objects, ${bucket.size_bytes || 0} bytes.`
        };
      }

      case 'create': {
        if (!ctx.input.bucketName) throw new Error('bucketName is required for create action');
        let bucket = await client.createBucket({
          name: ctx.input.bucketName,
          billingAccountId: ctx.input.billingAccountId
        });
        return {
          output: { bucket: mapBucket(bucket), success: true },
          message: `Created bucket **${ctx.input.bucketName}**.`
        };
      }

      case 'modify': {
        if (!ctx.input.bucketName || ctx.input.billingAccountId === undefined) {
          throw new Error('bucketName and billingAccountId are required for modify action');
        }
        let bucket = await client.modifyBucket(
          ctx.input.bucketName,
          ctx.input.billingAccountId
        );
        return {
          output: { bucket: mapBucket(bucket), success: true },
          message: `Updated billing for bucket **${ctx.input.bucketName}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.bucketName) throw new Error('bucketName is required for delete action');
        await client.deleteBucket(ctx.input.bucketName);
        return {
          output: { success: true },
          message: `Deleted bucket **${ctx.input.bucketName}**.`
        };
      }

      case 'get_s3_endpoint': {
        let url = await client.getS3Endpoint();
        return {
          output: { s3Endpoint: url, success: true },
          message: `S3 endpoint: **${url}**`
        };
      }
    }
  })
  .build();
