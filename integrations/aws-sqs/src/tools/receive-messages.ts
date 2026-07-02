import { SlateTool } from 'slates';
import { z } from 'zod';
import { SqsClient } from '../lib/client';
import { spec } from '../spec';

export let receiveMessages = SlateTool.create(spec, {
  name: 'Receive Messages',
  key: 'receive_messages',
  description: `Receive one or more messages from an SQS queue. Supports short polling (immediate return) and long polling (waits for messages). Received messages become invisible for the visibility timeout duration and must be explicitly deleted after processing.`,
  instructions: [
    'Use waitTimeSeconds > 0 for long polling to reduce costs and improve responsiveness.',
    'Messages must be deleted after successful processing using the Delete Message tool with the returned receiptHandle.'
  ],
  constraints: [
    'Maximum 10 messages per request.',
    'Long polling wait time is limited to 0-20 seconds.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      queueUrl: z.string().describe('Full URL of the SQS queue to receive messages from'),
      maxNumberOfMessages: z
        .number()
        .optional()
        .describe('Max messages to return (1-10). Default: 1'),
      visibilityTimeout: z
        .number()
        .optional()
        .describe(
          'Duration in seconds that received messages are hidden (0-43200). Default: queue setting'
        ),
      waitTimeSeconds: z
        .number()
        .optional()
        .describe('Long poll duration in seconds (0-20). 0 = short polling'),
      messageAttributeNames: z
        .array(z.string())
        .optional()
        .describe('Custom attribute names to include. Use ["All"] for all attributes'),
      messageSystemAttributeNames: z
        .array(z.string())
        .optional()
        .describe(
          'System attributes to include (e.g., "SenderId", "SentTimestamp", "ApproximateReceiveCount", "All")'
        )
    })
  )
  .output(
    z.object({
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Unique message identifier'),
            receiptHandle: z
              .string()
              .describe('Handle needed to delete or change visibility of the message'),
            body: z.string().describe('Message body content'),
            md5OfBody: z.string().describe('MD5 digest for integrity verification'),
            systemAttributes: z
              .record(z.string(), z.string())
              .optional()
              .describe('System attributes like SenderId, SentTimestamp'),
            messageAttributes: z
              .record(
                z.string(),
                z.object({
                  dataType: z.string().describe('Attribute data type'),
                  stringValue: z.string().optional().describe('Attribute string value')
                })
              )
              .optional()
              .describe('Custom message attributes')
          })
        )
        .describe('List of received messages')
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

    let messages = await client.receiveMessages({
      queueUrl: ctx.input.queueUrl,
      maxNumberOfMessages: ctx.input.maxNumberOfMessages,
      visibilityTimeout: ctx.input.visibilityTimeout,
      waitTimeSeconds: ctx.input.waitTimeSeconds,
      messageAttributeNames: ctx.input.messageAttributeNames,
      messageSystemAttributeNames: ctx.input.messageSystemAttributeNames
    });

    return {
      output: {
        messages: messages.map(m => ({
          messageId: m.messageId,
          receiptHandle: m.receiptHandle,
          body: m.body,
          md5OfBody: m.md5OfBody,
          systemAttributes: m.attributes,
          messageAttributes: m.messageAttributes
        }))
      },
      message:
        messages.length === 0
          ? 'No messages available in the queue'
          : `Received **${messages.length}** message(s)`
    };
  })
  .build();
