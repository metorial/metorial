import { SlateTool } from 'slates';
import { z } from 'zod';
import { S3Client } from '../lib/client';
import { hasS3ErrorCode, s3ServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageBucketPolicyTool = SlateTool.create(spec, {
  name: 'Manage Bucket Policy',
  key: 'manage_bucket_policy',
  description: `Get, set, or remove the JSON policy attached to an S3 bucket. Bucket policies control access to bucket and object resources.`,
  constraints: [
    'The policy input must be valid JSON.',
    'Deleting a policy removes bucket-policy access rules and does not delete IAM policies.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'put', 'delete'])
        .describe('Action to perform on the bucket policy'),
      bucketName: z.string().describe('Name of the S3 bucket'),
      policy: z.string().optional().describe('Bucket policy JSON string (required for "put")')
    })
  )
  .output(
    z.object({
      bucketName: z.string().describe('Name of the bucket'),
      action: z.string().describe('Action that was performed'),
      policy: z.string().optional().describe('Bucket policy JSON string')
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

    if (action === 'get') {
      try {
        let policy = await client.getBucketPolicy(bucketName);
        return {
          output: { bucketName, action, policy },
          message: `Retrieved bucket policy for \`${bucketName}\`.`
        };
      } catch (error) {
        if (!hasS3ErrorCode(error, 'NoSuchBucketPolicy')) {
          throw error;
        }

        return {
          output: { bucketName, action },
          message: `Bucket \`${bucketName}\` does not have a bucket policy.`
        };
      }
    }

    if (action === 'put') {
      if (!ctx.input.policy) {
        throw s3ServiceError('Policy JSON is required for the "put" action.');
      }

      let normalizedPolicy: string;
      try {
        normalizedPolicy = JSON.stringify(JSON.parse(ctx.input.policy));
      } catch (error) {
        throw s3ServiceError(
          `Policy must be valid JSON: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      await client.putBucketPolicy(bucketName, normalizedPolicy);
      return {
        output: { bucketName, action, policy: normalizedPolicy },
        message: `Updated bucket policy for \`${bucketName}\`.`
      };
    }

    await client.deleteBucketPolicy(bucketName);
    return {
      output: { bucketName, action },
      message: `Deleted bucket policy from \`${bucketName}\`.`
    };
  })
  .build();
