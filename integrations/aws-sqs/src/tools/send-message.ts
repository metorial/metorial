import { SlateTool } from 'slates';
import { z } from 'zod';
import { SqsClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message to an SQS queue. Supports optional delay, custom message attributes, and FIFO queue parameters (message group ID and deduplication ID).`,
  instructions: [
    'For FIFO queues, messageGroupId is required.',
    'For FIFO queues without content-based deduplication enabled, messageDeduplicationId is also required.'
  ],
  constraints: ['Message body size limit is 256 KB.', 'Delay range is 0-900 seconds.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      queueUrl: z.string().describe('Full URL of the target SQS queue'),
      messageBody: z.string().describe('The message content to send (max 256 KB)'),
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
              .describe('Attribute data type (e.g., "String", "Number", "Binary")'),
            stringValue: z.string().optional().describe('String value of the attribute')
          })
        )
        .optional()
        .describe('Custom message attributes as key-value pairs'),
      messageGroupId: z
        .string()
        .optional()
        .describe('Message group ID for FIFO queues (required for FIFO)'),
      messageDeduplicationId: z
        .string()
        .optional()
        .describe('Deduplication token for FIFO queues')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique ID assigned to the sent message'),
      md5OfMessageBody: z
        .string()
        .describe('MD5 digest of the message body for integrity verification'),
      sequenceNumber: z.string().optional().describe('Sequence number for FIFO queues')
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

    let result = await client.sendMessage({
      queueUrl: ctx.input.queueUrl,
      messageBody: ctx.input.messageBody,
      delaySeconds: ctx.input.delaySeconds,
      messageAttributes: ctx.input.messageAttributes,
      messageGroupId: ctx.input.messageGroupId,
      messageDeduplicationId: ctx.input.messageDeduplicationId
    });

    return {
      output: result,
      message: `Sent message **${result.messageId}** to queue`
    };
  })
  .build();
