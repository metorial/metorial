import { SlateTool } from 'slates';
import { z } from 'zod';
import { SqsClient } from '../lib/client';
import { sqsServiceError } from '../lib/errors';
import { spec } from '../spec';

export let changeMessageVisibility = SlateTool.create(spec, {
  name: 'Change Message Visibility',
  key: 'change_message_visibility',
  description: `Change the visibility timeout of a received message. Use this to extend the processing window when you need more time, or to make the message immediately available again by setting the timeout to 0.`,
  instructions: [
    'Use the receiptHandle from the most recent ReceiveMessage response.',
    'Set visibilityTimeout to 0 to make the message immediately available for other consumers.',
    'For batch updates, provide "entries" instead of "receiptHandle" and "visibilityTimeout".'
  ],
  constraints: [
    'Visibility timeout range: 0 to 43200 seconds (12 hours).',
    'Batch visibility updates can include up to 10 messages.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      queueUrl: z.string().describe('Full URL of the SQS queue'),
      receiptHandle: z
        .string()
        .optional()
        .describe('Receipt handle of the single message to update'),
      visibilityTimeout: z
        .number()
        .optional()
        .describe('New visibility timeout in seconds (0-43200) for a single message'),
      entries: z
        .array(
          z.object({
            entryId: z.string().describe('Unique identifier for this batch entry'),
            receiptHandle: z.string().describe('Receipt handle of the message'),
            visibilityTimeout: z
              .number()
              .describe('New visibility timeout in seconds (0-43200)')
          })
        )
        .optional()
        .describe(
          'Batch visibility changes for up to 10 messages. Use this instead of receiptHandle and visibilityTimeout.'
        )
    })
  )
  .output(
    z.object({
      updated: z.boolean().describe('Whether the visibility timeout update succeeded'),
      successful: z
        .array(z.string())
        .optional()
        .describe('Entry IDs that were successfully updated (batch mode)'),
      failed: z
        .array(
          z.object({
            entryId: z.string().describe('Entry ID that failed'),
            code: z.string().describe('Error code'),
            failureMessage: z.string().optional().describe('Error description'),
            senderFault: z.boolean().describe('Whether the error was caused by the sender')
          })
        )
        .optional()
        .describe('Entries that failed to update (batch mode)')
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

    if (ctx.input.entries && ctx.input.entries.length > 0) {
      let result = await client.changeMessageVisibilityBatch(
        ctx.input.queueUrl,
        ctx.input.entries
      );
      let successCount = result.successful.length;
      let failCount = result.failed.length;

      return {
        output: {
          updated: failCount === 0,
          successful: result.successful,
          failed: result.failed.map(f => ({
            entryId: f.entryId,
            code: f.code,
            failureMessage: f.message,
            senderFault: f.senderFault
          }))
        },
        message: `Batch visibility update: **${successCount}** succeeded, **${failCount}** failed`
      };
    }

    if (!ctx.input.receiptHandle || ctx.input.visibilityTimeout === undefined) {
      throw sqsServiceError(
        'Either "receiptHandle" plus "visibilityTimeout" for a single message or "entries" for batch visibility updates must be provided.'
      );
    }

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
