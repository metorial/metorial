import { SlateTool } from 'slates';
import { z } from 'zod';
import { SqsClient } from '../lib/client';
import { spec } from '../spec';

export let changeMessageVisibility = SlateTool.create(spec, {
  name: 'Change Message Visibility',
  key: 'change_message_visibility',
  description: `Change the visibility timeout of a received message. Use this to extend the processing window when you need more time, or to make the message immediately available again by setting the timeout to 0.`,
  instructions: [
    'Use the receiptHandle from the most recent ReceiveMessage response.',
    'Set visibilityTimeout to 0 to make the message immediately available for other consumers.'
  ],
  constraints: ['Visibility timeout range: 0 to 43200 seconds (12 hours).'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      queueUrl: z.string().describe('Full URL of the SQS queue'),
      receiptHandle: z.string().describe('Receipt handle of the message'),
      visibilityTimeout: z.number().describe('New visibility timeout in seconds (0-43200)')
    })
  )
  .output(
    z.object({
      updated: z.boolean().describe('Whether the visibility timeout was updated')
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

    await client.changeMessageVisibility(
      ctx.input.queueUrl,
      ctx.input.receiptHandle,
      ctx.input.visibilityTimeout
    );

    return {
      output: { updated: true },
      message: `Updated visibility timeout to **${ctx.input.visibilityTimeout}** seconds`
    };
  })
  .build();
