import { SlateTool } from 'slates';
import { z } from 'zod';
import { SqsClient } from '../lib/client';
import { spec } from '../spec';

export let deleteQueue = SlateTool.create(spec, {
  name: 'Delete Queue',
  key: 'delete_queue',
  description: `Permanently delete an SQS queue and all its messages. The deletion process takes up to 60 seconds, during which the queue is not accessible.`,
  instructions: [
    'You must wait at least 60 seconds after deletion before creating a queue with the same name.'
  ],
  constraints: ['All messages in the queue are permanently lost upon deletion.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      queueUrl: z.string().describe('Full URL of the SQS queue to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the queue was successfully deleted')
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

    await client.deleteQueue(ctx.input.queueUrl);

    return {
      output: { deleted: true },
      message: `Deleted queue \`${ctx.input.queueUrl}\``
    };
  })
  .build();
