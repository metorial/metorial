import { SlateTool } from 'slates';
import { z } from 'zod';
import { SqsClient } from '../lib/client';
import { spec } from '../spec';

export let purgeQueue = SlateTool.create(spec, {
  name: 'Purge Queue',
  key: 'purge_queue',
  description: `Delete all messages from an SQS queue, including in-flight messages. The purge process takes up to 60 seconds. Messages sent before the purge are deleted; messages sent during purge may also be deleted.`,
  constraints: [
    'Cannot be called more than once every 60 seconds on the same queue.',
    'Deleted messages cannot be recovered.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      queueUrl: z.string().describe('Full URL of the SQS queue to purge')
    })
  )
  .output(
    z.object({
      purged: z.boolean().describe('Whether the purge was initiated successfully')
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

    await client.purgeQueue(ctx.input.queueUrl);

    return {
      output: { purged: true },
      message: `Purge initiated for queue. All messages will be deleted within 60 seconds.`
    };
  })
  .build();
