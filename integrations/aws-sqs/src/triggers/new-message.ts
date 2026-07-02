import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SqsClient } from '../lib/client';
import { spec } from '../spec';

export let newMessage = SlateTrigger.create(spec, {
  name: 'New Message',
  key: 'new_message',
  description:
    'Triggers when new messages are available in an SQS queue. Polls the queue at regular intervals and returns received messages. Messages remain in the queue and become visible again after the visibility timeout.'
})
  .input(
    z.object({
      messageId: z.string().describe('SQS message ID'),
      receiptHandle: z.string().describe('Receipt handle for processing the message'),
      body: z.string().describe('Message body content'),
      md5OfBody: z.string().describe('MD5 digest of the message body'),
      systemAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('System attributes like SenderId, SentTimestamp'),
      messageAttributes: z
        .record(
          z.string(),
          z.object({
            dataType: z.string(),
            stringValue: z.string().optional()
          })
        )
        .optional()
        .describe('Custom message attributes'),
      queueUrl: z.string().describe('Source queue URL')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('SQS message ID'),
      receiptHandle: z
        .string()
        .describe('Receipt handle for deleting or changing visibility of the message'),
      body: z.string().describe('Message body content'),
      md5OfBody: z.string().describe('MD5 digest of the message body'),
      queueUrl: z.string().describe('Source queue URL'),
      senderId: z.string().optional().describe('AWS account ID or IAM identity of the sender'),
      sentTimestamp: z
        .string()
        .optional()
        .describe('Epoch timestamp (ms) when the message was sent'),
      approximateReceiveCount: z
        .string()
        .optional()
        .describe('Number of times this message has been received'),
      approximateFirstReceiveTimestamp: z
        .string()
        .optional()
        .describe('Epoch timestamp (ms) when the message was first received'),
      messageGroupId: z.string().optional().describe('Message group ID (FIFO queues only)'),
      messageDeduplicationId: z
        .string()
        .optional()
        .describe('Deduplication ID (FIFO queues only)'),
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
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let state = ctx.state as { queueUrl?: string } | undefined;
      let queueUrl = state?.queueUrl;

      if (!queueUrl) {
        return { inputs: [], updatedState: state ?? {} };
      }

      let client = new SqsClient({
        region: ctx.config.region,
        credentials: {
          accessKeyId: ctx.auth.accessKeyId,
          secretAccessKey: ctx.auth.secretAccessKey,
          sessionToken: ctx.auth.sessionToken
        }
      });

      let messages = await client.receiveMessages({
        queueUrl,
        maxNumberOfMessages: 10,
        waitTimeSeconds: 0,
        messageAttributeNames: ['All'],
        messageSystemAttributeNames: ['All']
      });

      return {
        inputs: messages.map(m => ({
          messageId: m.messageId,
          receiptHandle: m.receiptHandle,
          body: m.body,
          md5OfBody: m.md5OfBody,
          systemAttributes: m.attributes,
          messageAttributes: m.messageAttributes,
          queueUrl
        })),
        updatedState: { queueUrl }
      };
    },

    handleEvent: async ctx => {
      let systemAttrs = ctx.input.systemAttributes ?? {};

      return {
        type: 'message.received',
        id: ctx.input.messageId,
        output: {
          messageId: ctx.input.messageId,
          receiptHandle: ctx.input.receiptHandle,
          body: ctx.input.body,
          md5OfBody: ctx.input.md5OfBody,
          queueUrl: ctx.input.queueUrl,
          senderId: systemAttrs.SenderId,
          sentTimestamp: systemAttrs.SentTimestamp,
          approximateReceiveCount: systemAttrs.ApproximateReceiveCount,
          approximateFirstReceiveTimestamp: systemAttrs.ApproximateFirstReceiveTimestamp,
          messageGroupId: systemAttrs.MessageGroupId,
          messageDeduplicationId: systemAttrs.MessageDeduplicationId,
          messageAttributes: ctx.input.messageAttributes
        }
      };
    }
  })
  .build();
