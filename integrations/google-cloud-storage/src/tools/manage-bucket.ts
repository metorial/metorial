import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudStorageActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageBucket = SlateTool.create(spec, {
  name: 'Manage Bucket',
  key: 'manage_bucket',
  description: `Create, update, or delete a Cloud Storage bucket. When creating, specify a name and optionally a location, storage class, and versioning. When updating, provide any fields to modify. When deleting, the bucket must be empty.`,
  instructions: [
    'To create a bucket, set action to "create" and provide a globally unique bucket name.',
    'To update, set action to "update" and provide only the fields you want to change.',
    'To delete, set action to "delete". The bucket must be empty before deletion.'
  ],
  tags: {
    destructive: true
  }
})
  .scopes(googleCloudStorageActionScopes.manageBucket)
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Operation to perform on the bucket'),
      bucketName: z.string().describe('Globally unique name of the bucket'),
      location: z
        .string()
        .optional()
        .describe(
          'Geographic location for the bucket (e.g., "US", "EU", "us-central1"). Used when creating.'
        ),
      storageClass: z
        .enum(['STANDARD', 'NEARLINE', 'COLDLINE', 'ARCHIVE'])
        .optional()
        .describe('Default storage class for the bucket'),
      enableVersioning: z.boolean().optional().describe('Enable or disable object versioning'),
      enableHierarchicalNamespace: z
        .boolean()
        .optional()
        .describe(
          'Enable hierarchical namespace (folder support). Only settable at creation.'
        ),
      labels: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value labels to apply to the bucket'),
      website: z
        .object({
          mainPageSuffix: z
            .string()
            .optional()
            .describe('Object name suffix for main page (e.g., "index.html")'),
          notFoundPage: z
            .string()
            .optional()
            .describe('Object name for 404 page (e.g., "404.html")')
        })
        .optional()
        .describe('Static website hosting configuration'),
      retentionPeriodSeconds: z
        .string()
        .optional()
        .describe('Minimum retention period in seconds for objects'),
      softDeleteRetentionSeconds: z
        .string()
        .optional()
        .describe('Soft delete retention duration in seconds')
    })
  )
  .output(
    z.object({
      bucketName: z.string().optional(),
      location: z.string().optional(),
      storageClass: z.string().optional(),
      createdAt: z.string().optional(),
      versioningEnabled: z.boolean().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    if (ctx.input.action === 'create') {
      let result = await client.createBucket({
        name: ctx.input.bucketName,
        location: ctx.input.location,
        storageClass: ctx.input.storageClass,
        enableVersioning: ctx.input.enableVersioning,
        enableHierarchicalNamespace: ctx.input.enableHierarchicalNamespace
      });

      return {
        output: {
          bucketName: result.name,
          location: result.location,
          storageClass: result.storageClass,
          createdAt: result.timeCreated,
          versioningEnabled: result.versioning?.enabled || false
        },
        message: `Created bucket **${result.name}** in ${result.location} with storage class ${result.storageClass}.`
      };
    }

    if (ctx.input.action === 'update') {
      let result = await client.updateBucket(ctx.input.bucketName, {
        storageClass: ctx.input.storageClass,
        enableVersioning: ctx.input.enableVersioning,
        labels: ctx.input.labels,
        website: ctx.input.website,
        retentionPolicy: ctx.input.retentionPeriodSeconds
          ? { retentionPeriod: ctx.input.retentionPeriodSeconds }
          : undefined,
        softDeletePolicy: ctx.input.softDeleteRetentionSeconds
          ? { retentionDurationSeconds: ctx.input.softDeleteRetentionSeconds }
          : undefined
      });

      return {
        output: {
          bucketName: result.name,
          location: result.location,
          storageClass: result.storageClass,
          createdAt: result.timeCreated,
          versioningEnabled: result.versioning?.enabled || false
        },
        message: `Updated bucket **${result.name}**.`
      };
    }

    // delete
    await client.deleteBucket(ctx.input.bucketName);

    return {
      output: {
        bucketName: ctx.input.bucketName,
        deleted: true
      },
      message: `Deleted bucket **${ctx.input.bucketName}**.`
    };
  })
  .build();
