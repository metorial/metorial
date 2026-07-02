import { SlateTool } from 'slates';
import { z } from 'zod';
import { S3Client } from '../lib/client';
import { s3ServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageObjectTagsTool = SlateTool.create(spec, {
  name: 'Manage Object Tags',
  key: 'manage_object_tags',
  description: `Get, set, or remove tags on an S3 object. Tags are key-value pairs useful for cost allocation, access control, and automation.
When setting tags, provide the **complete** tag set — existing tags are replaced entirely.`,
  constraints: [
    'Maximum of 10 tags per object.',
    'Tag keys can be up to 128 characters; values up to 256 characters.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'set', 'delete']).describe('Action to perform on tags'),
      bucketName: z.string().describe('Name of the S3 bucket'),
      objectKey: z.string().describe('Key (path) of the object'),
      versionId: z.string().optional().describe('Specific version ID (for versioned buckets)'),
      tags: z
        .array(
          z.object({
            key: z.string().describe('Tag key'),
            value: z.string().describe('Tag value')
          })
        )
        .max(10)
        .optional()
        .describe('Tags to set (required for "set" action, replaces all existing tags)')
    })
  )
  .output(
    z.object({
      objectKey: z.string().describe('Key of the object'),
      tags: z
        .array(
          z.object({
            key: z.string().describe('Tag key'),
            value: z.string().describe('Tag value')
          })
        )
        .optional()
        .describe('Current tags on the object (returned for "get" and "set" actions)'),
      action: z.string().describe('Action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new S3Client({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let { action, bucketName, objectKey, versionId, tags } = ctx.input;

    if (action === 'get') {
      let currentTags = await client.getObjectTagging(bucketName, objectKey, versionId);
      return {
        output: { objectKey, tags: currentTags, action },
        message: `Object \`${objectKey}\` has **${currentTags.length}** tag(s).`
      };
    }

    if (action === 'set') {
      if (!tags || tags.length === 0) {
        throw s3ServiceError('Tags are required for the "set" action.');
      }
      await client.putObjectTagging(bucketName, objectKey, tags, versionId);
      return {
        output: { objectKey, tags, action },
        message: `Set **${tags.length}** tag(s) on \`${objectKey}\`.`
      };
    }

    // delete
    await client.deleteObjectTagging(bucketName, objectKey, versionId);
    return {
      output: { objectKey, action },
      message: `Removed all tags from \`${objectKey}\`.`
    };
  })
  .build();
