import { SlateTool } from 'slates';
import { z } from 'zod';
import { S3Client } from '../lib/client';
import { spec } from '../spec';

export let manageBucketTool = SlateTool.create(spec, {
  name: 'Manage Bucket',
  key: 'manage_bucket',
  description: `Create or delete an S3 bucket. When creating, the bucket is placed in the configured region. When deleting, the bucket must be empty.
Also supports enabling/disabling versioning on a bucket.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'delete', 'enable_versioning', 'suspend_versioning'])
        .describe('Action to perform on the bucket'),
      bucketName: z.string().describe('Name of the S3 bucket')
    })
  )
  .output(
    z.object({
      bucketName: z.string().describe('Name of the bucket acted upon'),
      action: z.string().describe('Action that was performed'),
      versioningStatus: z
        .string()
        .optional()
        .describe('Current versioning status after the action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new S3Client({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let { action, bucketName } = ctx.input;
    let versioningStatus: string | undefined;

    if (action === 'create') {
      await client.createBucket(bucketName);
    } else if (action === 'delete') {
      await client.deleteBucket(bucketName);
    } else if (action === 'enable_versioning') {
      await client.putBucketVersioning(bucketName, 'Enabled');
      versioningStatus = 'Enabled';
    } else if (action === 'suspend_versioning') {
      await client.putBucketVersioning(bucketName, 'Suspended');
      versioningStatus = 'Suspended';
    }

    let actionLabel = action.replace('_', ' ');
    return {
      output: { bucketName, action, versioningStatus },
      message: `Successfully performed **${actionLabel}** on bucket \`${bucketName}\`.`
    };
  })
  .build();
