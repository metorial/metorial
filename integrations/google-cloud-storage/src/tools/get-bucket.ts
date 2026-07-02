import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudStorageActionScopes } from '../scopes';
import { spec } from '../spec';

export let getBucket = SlateTool.create(spec, {
  name: 'Get Bucket',
  key: 'get_bucket',
  description: `Get detailed information about a Cloud Storage bucket including its location, storage class, versioning status, lifecycle rules, website configuration, labels, and encryption settings.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudStorageActionScopes.getBucket)
  .input(
    z.object({
      bucketName: z.string().describe('Name of the bucket')
    })
  )
  .output(
    z.object({
      bucketName: z.string(),
      location: z.string().optional(),
      locationType: z.string().optional(),
      storageClass: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      versioningEnabled: z.boolean().optional(),
      labels: z.record(z.string(), z.string()).optional(),
      lifecycleRuleCount: z.number().optional(),
      website: z
        .object({
          mainPageSuffix: z.string().optional(),
          notFoundPage: z.string().optional()
        })
        .optional(),
      retentionPolicy: z
        .object({
          retentionPeriod: z.string().optional(),
          isLocked: z.boolean().optional()
        })
        .optional(),
      encryption: z
        .object({
          defaultKmsKeyName: z.string().optional()
        })
        .optional(),
      softDeletePolicy: z
        .object({
          retentionDurationSeconds: z.string().optional()
        })
        .optional(),
      uniformBucketLevelAccess: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let bucket = await client.getBucket(ctx.input.bucketName);

    return {
      output: {
        bucketName: bucket.name,
        location: bucket.location,
        locationType: bucket.locationType,
        storageClass: bucket.storageClass,
        createdAt: bucket.timeCreated,
        updatedAt: bucket.updated,
        versioningEnabled: bucket.versioning?.enabled || false,
        labels: bucket.labels,
        lifecycleRuleCount: bucket.lifecycle?.rule?.length || 0,
        website: bucket.website
          ? {
              mainPageSuffix: bucket.website.mainPageSuffix,
              notFoundPage: bucket.website.notFoundPage
            }
          : undefined,
        retentionPolicy: bucket.retentionPolicy
          ? {
              retentionPeriod: bucket.retentionPolicy.retentionPeriod,
              isLocked: bucket.retentionPolicy.isLocked
            }
          : undefined,
        encryption: bucket.encryption
          ? {
              defaultKmsKeyName: bucket.encryption.defaultKmsKeyName
            }
          : undefined,
        softDeletePolicy: bucket.softDeletePolicy
          ? {
              retentionDurationSeconds: bucket.softDeletePolicy.retentionDurationSeconds
            }
          : undefined,
        uniformBucketLevelAccess: bucket.iamConfiguration?.uniformBucketLevelAccess?.enabled
      },
      message: `Bucket **${bucket.name}** is in ${bucket.location} (${bucket.locationType}), storage class ${bucket.storageClass}. Versioning: ${bucket.versioning?.enabled ? 'enabled' : 'disabled'}.`
    };
  })
  .build();
