import { SlateTool } from 'slates';
import { z } from 'zod';
import { SqsClient } from '../lib/client';
import { sqsServiceError } from '../lib/errors';
import { spec } from '../spec';

export let deleteMessage = SlateTool.create(spec, {
  name: 'Delete Message',
  key: 'delete_message',
  description: `Delete a message from an SQS queue using its receipt handle. Messages should be deleted after successful processing to prevent redelivery. Supports deleting a single message or a batch of up to 10 messages.`,
  instructions: [
    'Use the receiptHandle from the most recent ReceiveMessage response—not the messageId.',
    'For batch deletion, provide the "entries" field instead of "receiptHandle".'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      queueUrl: z.string().describe('Full URL of the SQS queue'),
      receiptHandle: z
        .string()
        .optional()
        .describe('Receipt handle of the single message to delete'),
      entries: z
        .array(
          z.object({
            entryId: z.string().describe('Unique identifier for this batch entry'),
            receiptHandle: z.string().describe('Receipt handle of the message to delete')
          })
        )
        .optional()
        .describe(
          'Array of messages to delete in batch (max 10). Use this instead of receiptHandle for batch deletions.'
        )
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful'),
      successful: z
        .array(z.string())
        .optional()
        .describe('Entry IDs that were successfully deleted (batch mode)'),
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
        .describe('Entries that failed to delete (batch mode)')
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
      let result = await client.deleteMessageBatch(ctx.input.queueUrl, ctx.input.entries);

      let successCount = result.successful.length;
      let failCount = result.failed.length;

      return {
        output: {
          deleted: failCount === 0,
          successful: result.successful,
          failed: result.failed.map(f => ({
            entryId: f.entryId,
            code: f.code,
            failureMessage: f.message,
            senderFault: f.senderFault
          }))
        },
        message: `Batch delete: **${successCount}** succeeded, **${failCount}** failed`
      };
    }

    if (!ctx.input.receiptHandle) {
      throw sqsServiceError(
        'Either "receiptHandle" for single deletion or "entries" for batch deletion must be provided.'
      );
    }

    await client.deleteMessage(ctx.input.queueUrl, ctx.input.receiptHandle);

    return {
      output: { deleted: true },
      message: 'Message deleted successfully'
    };
  })
  .build();
