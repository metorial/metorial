import { SlateTool } from 'slates';
import { z } from 'zod';
import { S3Client } from '../lib/client';
import { spec } from '../spec';

export let listBucketsTool = SlateTool.create(spec, {
  name: 'List Buckets',
  key: 'list_buckets',
  description: `List all S3 buckets in the AWS account. Returns bucket names and creation dates. Use this to discover available buckets before performing operations on specific buckets.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      buckets: z
        .array(
          z.object({
            bucketName: z.string().describe('Name of the S3 bucket'),
            creationDate: z
              .string()
              .describe('ISO 8601 timestamp of when the bucket was created')
          })
        )
        .describe('List of S3 buckets in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new S3Client({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let buckets = await client.listBuckets();

    return {
      output: { buckets },
      message: `Found **${buckets.length}** bucket${buckets.length !== 1 ? 's' : ''} in the account.`
    };
  })
  .build();
