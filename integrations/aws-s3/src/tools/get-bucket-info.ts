import { SlateTool } from 'slates';
import { z } from 'zod';
import { S3Client } from '../lib/client';
import { hasS3ErrorCode } from '../lib/errors';
import { spec } from '../spec';

export let getBucketInfoTool = SlateTool.create(spec, {
  name: 'Get Bucket Info',
  key: 'get_bucket_info',
  description: `Retrieve configuration details about an S3 bucket including its location, versioning status, tags, and bucket policy.
Select which details to include using the **include** parameter.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bucketName: z.string().describe('Name of the S3 bucket'),
      include: z
        .array(z.enum(['location', 'versioning', 'tags', 'policy']))
        .optional()
        .describe('Which details to include (defaults to all)')
    })
  )
  .output(
    z.object({
      bucketName: z.string().describe('Name of the bucket'),
      location: z.string().optional().describe('AWS region where the bucket is located'),
      versioningStatus: z
        .string()
        .optional()
        .describe('Versioning status: Enabled, Suspended, or Disabled'),
      tags: z
        .array(
          z.object({
            key: z.string().describe('Tag key'),
            value: z.string().describe('Tag value')
          })
        )
        .optional()
        .describe('Bucket tags'),
      policy: z.string().optional().describe('Bucket policy as JSON string')
    })
  )
  .handleInvocation(async ctx => {
    let client = new S3Client({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let { bucketName } = ctx.input;
    let include = ctx.input.include || ['location', 'versioning', 'tags', 'policy'];

    let output: {
      bucketName: string;
      location?: string;
      versioningStatus?: string;
      tags?: Array<{ key: string; value: string }>;
      policy?: string;
    } = { bucketName };

    let details: string[] = [];

    if (include.includes('location')) {
      output.location = await client.getBucketLocation(bucketName);
      details.push(`region: ${output.location}`);
    }

    if (include.includes('versioning')) {
      let versioning = await client.getBucketVersioning(bucketName);
      output.versioningStatus = versioning.status;
      details.push(`versioning: ${versioning.status}`);
    }

    if (include.includes('tags')) {
      try {
        output.tags = await client.getBucketTagging(bucketName);
        details.push(`${output.tags.length} tag(s)`);
      } catch (error) {
        if (!hasS3ErrorCode(error, 'NoSuchTagSet')) {
          throw error;
        }
        output.tags = [];
        details.push('0 tags');
      }
    }

    if (include.includes('policy')) {
      try {
        output.policy = await client.getBucketPolicy(bucketName);
        details.push('policy present');
      } catch (error) {
        if (!hasS3ErrorCode(error, 'NoSuchBucketPolicy')) {
          throw error;
        }
        details.push('no policy');
      }
    }

    return {
      output,
      message: `Bucket \`${bucketName}\`: ${details.join(', ')}.`
    };
  })
  .build();
