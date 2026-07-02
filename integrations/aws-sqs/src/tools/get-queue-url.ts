import { SlateTool } from 'slates';
import { z } from 'zod';
import { SqsClient } from '../lib/client';
import { spec } from '../spec';

export let getQueueUrl = SlateTool.create(spec, {
  name: 'Get Queue URL',
  key: 'get_queue_url',
  description: `Look up the URL of an SQS queue by its name. Useful when you know the queue name but need the full URL for other operations. Can also look up queues owned by other AWS accounts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      queueName: z.string().describe('Name of the queue to look up'),
      queueOwnerAccountId: z
        .string()
        .optional()
        .describe('AWS account ID of the queue owner (only needed for cross-account access)')
    })
  )
  .output(
    z.object({
      queueUrl: z.string().describe('Full URL of the SQS queue')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SqsClient({
      region: ctx.config.region,
      credentials: {
        accessKeyId: ctx.auth.accessKeyId,
        secretAccessKey: ctx.auth.secretAccessKey,
        sessionToken: ctx.auth.sessionToken
      }
    });

    let queueUrl = await client.getQueueUrl(
      ctx.input.queueName,
      ctx.input.queueOwnerAccountId
    );

    return {
      output: { queueUrl },
      message: `Queue URL: \`${queueUrl}\``
    };
  })
  .build();
