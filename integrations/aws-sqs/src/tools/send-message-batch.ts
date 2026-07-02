import { SlateTool } from 'slates';
import { z } from 'zod';
import { SqsClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessageBatch = SlateTool.create(spec, {
  name: 'Send Message Batch',
  key: 'send_message_batch',
  description: `Send up to 10 messages to an SQS queue in a single batch request. Each message can have its own body, delay, and attributes. Returns results for both successful and failed entries.`,
  constraints: [
    'Maximum 10 messages per batch.',
    'Total payload size for the batch must not exceed 256 KB.',
    'Each entry requires a unique ID within the batch.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      queueUrl: z.string().describe('Full URL of the target SQS queue'),
      entries: z
        .array(
          z.object({
            entryId: z.string().describe('Unique identifier for this entry within the batch'),
            messageBody: z.string().describe('Message content to send'),
            delaySeconds: z
              .number()
              .optional()
              .describe('Delay before message becomes visible (0-900 seconds)'),
            messageAttributes: z
              .record(
                z.string(),
                z.object({
                  dataType: z
                    .string()
                    .describe('Attribute data type (e.g., "String", "Number")'),
                  stringValue: z.string().optional().describe('String value of the attribute')
                })
              )
              .optional()
              .describe('Custom message attributes'),
            messageGroupId: z.string().optional().describe('Message group ID for FIFO queues'),
            messageDeduplicationId: z
              .string()
              .optional()
              .describe('Deduplication token for FIFO queues')
          })
        )
        .describe('Array of messages to send (max 10)')
    })
  )
  .output(
    z.object({
      successful: z
        .array(
          z.object({
            entryId: z.string().describe('Batch entry ID that succeeded'),
            sqsMessageId: z.string().describe('SQS-assigned message ID'),
            md5OfMessageBody: z.string().describe('MD5 digest of the message body'),
            sequenceNumber: z.string().optional().describe('Sequence number for FIFO queues')
          })
        )
        .describe('Successfully sent messages'),
      failed: z
        .array(
          z.object({
            entryId: z.string().describe('Batch entry ID that failed'),
            senderFault: z.boolean().describe('Whether the error was caused by the sender'),
            code: z.string().describe('Error code'),
            failureMessage: z.string().optional().describe('Error message description')
          })
        )
        .describe('Failed messages')
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

    let result = await client.sendMessageBatch(
      ctx.input.queueUrl,
      ctx.input.entries.map(e => ({
        messageId: e.entryId,
        messageBody: e.messageBody,
        delaySeconds: e.delaySeconds,
        messageAttributes: e.messageAttributes,
        messageGroupId: e.messageGroupId,
        messageDeduplicationId: e.messageDeduplicationId
      }))
    );

    let successCount = result.successful.length;
    let failCount = result.failed.length;

    return {
      output: {
        successful: result.successful.map(s => ({
          entryId: s.messageId,
          sqsMessageId: s.sqsMessageId,
          md5OfMessageBody: s.md5OfMessageBody,
          sequenceNumber: s.sequenceNumber
        })),
        failed: result.failed.map(f => ({
          entryId: f.messageId,
          senderFault: f.senderFault,
          code: f.code,
          failureMessage: f.message
        }))
      },
      message: `Batch send: **${successCount}** succeeded, **${failCount}** failed`
    };
  })
  .build();
