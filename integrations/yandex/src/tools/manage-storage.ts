import { SlateTool } from 'slates';
import { z } from 'zod';
import * as storage from '../lib/storage';
import { spec } from '../spec';

export let listBuckets = SlateTool.create(spec, {
  name: 'List Buckets',
  key: 'list_buckets',
  description: `List all Object Storage buckets accessible by the authenticated account. Returns bucket names and creation dates.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      buckets: z.any().describe('List of buckets')
    })
  )
  .handleInvocation(async ctx => {
    let result = await storage.listBuckets(ctx.auth);

    return {
      output: {
        buckets: result
      },
      message: `Retrieved bucket list.`
    };
  })
  .build();

export let manageBucket = SlateTool.create(spec, {
  name: 'Manage Bucket',
  key: 'manage_bucket',
  description: `Create, get details, update settings, or delete an Object Storage bucket. Supports configuring access flags, storage class, versioning, and size limits.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update', 'delete']).describe('Action to perform'),
      bucketName: z.string().describe('Name of the bucket'),
      folderId: z.string().optional().describe('Folder ID (required for create)'),
      defaultStorageClass: z
        .string()
        .optional()
        .describe('Default storage class (e.g. STANDARD, COLD, ICE)'),
      maxSize: z.number().optional().describe('Maximum bucket size in bytes'),
      versioning: z
        .enum(['VERSIONING_DISABLED', 'VERSIONING_ENABLED', 'VERSIONING_SUSPENDED'])
        .optional()
        .describe('Versioning configuration'),
      anonymousAccessRead: z.boolean().optional().describe('Allow anonymous read access'),
      anonymousAccessList: z.boolean().optional().describe('Allow anonymous list access')
    })
  )
  .output(
    z.object({
      bucket: z.any().optional().describe('Bucket details'),
      operationId: z.string().optional().describe('Operation ID for async operations')
    })
  )
  .handleInvocation(async ctx => {
    let result: any;

    switch (ctx.input.action) {
      case 'create': {
        let folderId = ctx.input.folderId || ctx.config.folderId;
        if (!folderId) throw new Error('folderId is required for bucket creation');
        result = await storage.createBucket(ctx.auth, {
          folderId,
          name: ctx.input.bucketName,
          defaultStorageClass: ctx.input.defaultStorageClass,
          maxSize: ctx.input.maxSize,
          anonymousAccessFlags:
            ctx.input.anonymousAccessRead !== undefined ||
            ctx.input.anonymousAccessList !== undefined
              ? {
                  read: ctx.input.anonymousAccessRead,
                  list: ctx.input.anonymousAccessList
                }
              : undefined
        });
        return {
          output: { bucket: result },
          message: `Bucket **${ctx.input.bucketName}** created.`
        };
      }
      case 'get': {
        result = await storage.getBucket(ctx.auth, ctx.input.bucketName);
        return {
          output: { bucket: result },
          message: `Retrieved details for bucket **${ctx.input.bucketName}**.`
        };
      }
      case 'update': {
        let updateFields: string[] = [];
        if (ctx.input.defaultStorageClass !== undefined)
          updateFields.push('defaultStorageClass');
        if (ctx.input.maxSize !== undefined) updateFields.push('maxSize');
        if (ctx.input.versioning !== undefined) updateFields.push('versioning');
        if (
          ctx.input.anonymousAccessRead !== undefined ||
          ctx.input.anonymousAccessList !== undefined
        ) {
          updateFields.push('anonymousAccessFlags');
        }
        result = await storage.updateBucket(ctx.auth, ctx.input.bucketName, {
          defaultStorageClass: ctx.input.defaultStorageClass,
          maxSize: ctx.input.maxSize,
          versioning: ctx.input.versioning,
          anonymousAccessFlags:
            ctx.input.anonymousAccessRead !== undefined ||
            ctx.input.anonymousAccessList !== undefined
              ? {
                  read: ctx.input.anonymousAccessRead,
                  list: ctx.input.anonymousAccessList
                }
              : undefined,
          updateMask: updateFields.join(',')
        });
        return {
          output: { bucket: result },
          message: `Bucket **${ctx.input.bucketName}** updated. Fields: ${updateFields.join(', ')}.`
        };
      }
      case 'delete': {
        result = await storage.deleteBucket(ctx.auth, ctx.input.bucketName);
        return {
          output: { operationId: result?.id },
          message: `Bucket **${ctx.input.bucketName}** deleted.`
        };
      }
    }
  })
  .build();

export let listObjects = SlateTool.create(spec, {
  name: 'List Objects',
  key: 'list_objects',
  description: `List objects in an Object Storage bucket. Supports prefix filtering and pagination for navigating large buckets.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      bucketName: z.string().describe('Name of the bucket'),
      prefix: z.string().optional().describe('Filter objects by key prefix'),
      maxKeys: z.number().optional().describe('Maximum number of objects to return'),
      continuationToken: z.string().optional().describe('Token for pagination')
    })
  )
  .output(
    z.object({
      objects: z.any().describe('List of objects in the bucket')
    })
  )
  .handleInvocation(async ctx => {
    let result = await storage.listObjects(
      ctx.auth,
      ctx.input.bucketName,
      ctx.input.prefix,
      ctx.input.maxKeys,
      ctx.input.continuationToken
    );

    return {
      output: {
        objects: result
      },
      message: `Listed objects in bucket **${ctx.input.bucketName}**${ctx.input.prefix ? ` with prefix "${ctx.input.prefix}"` : ''}.`
    };
  })
  .build();
