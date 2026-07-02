import { SlateTool } from 'slates';
import { z } from 'zod';
import { S3Client } from '../lib/client';
import { hasS3ErrorCode, s3ServiceError } from '../lib/errors';
import { spec } from '../spec';

let tagSchema = z.object({
  key: z.string().describe('Tag key'),
  value: z.string().describe('Tag value')
});

export let manageBucketTagsTool = SlateTool.create(spec, {
  name: 'Manage Bucket Tags',
  key: 'manage_bucket_tags',
  description: `Get, set, or remove tags on an S3 bucket. Bucket tags are useful for cost allocation, organization, and attribute-based access control.
When setting tags, provide the complete tag set because Amazon S3 replaces the current bucket tags.`,
  constraints: [
    'This operation is for general purpose buckets, not S3 directory buckets.',
    'Setting tags replaces the complete existing tag set.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'set', 'delete']).describe('Action to perform on bucket tags'),
      bucketName: z.string().describe('Name of the S3 bucket'),
      tags: z
        .array(tagSchema)
        .max(50)
        .optional()
        .describe('Tags to set (required for "set", replaces all existing tags)')
    })
  )
  .output(
    z.object({
      bucketName: z.string().describe('Name of the bucket'),
      action: z.string().describe('Action that was performed'),
      tags: z.array(tagSchema).optional().describe('Current tags after the action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new S3Client({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let { action, bucketName, tags } = ctx.input;

    if (action === 'get') {
      try {
        let currentTags = await client.getBucketTagging(bucketName);
        return {
          output: { bucketName, action, tags: currentTags },
          message: `Bucket \`${bucketName}\` has **${currentTags.length}** tag(s).`
        };
      } catch (error) {
        if (!hasS3ErrorCode(error, 'NoSuchTagSet')) {
          throw error;
        }

        return {
          output: { bucketName, action, tags: [] },
          message: `Bucket \`${bucketName}\` has **0** tags.`
        };
      }
    }

    if (action === 'set') {
      if (!tags || tags.length === 0) {
        throw s3ServiceError('Tags are required for the "set" action.');
      }

      await client.putBucketTagging(bucketName, tags);
      return {
        output: { bucketName, action, tags },
        message: `Set **${tags.length}** tag(s) on bucket \`${bucketName}\`.`
      };
    }

    await client.deleteBucketTagging(bucketName);
    return {
      output: { bucketName, action },
      message: `Removed all tags from bucket \`${bucketName}\`.`
    };
  })
  .build();
