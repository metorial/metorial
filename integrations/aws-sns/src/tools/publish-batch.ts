import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { snsServiceError } from '../lib/errors';
import { spec } from '../spec';

let messageAttributesSchema = z
  .record(
    z.string(),
    z.object({
      dataType: z.string().describe('Data type: String, Number, or Binary'),
      stringValue: z.string().optional().describe('String or Number value'),
      binaryValue: z.string().optional().describe('Base64-encoded binary value')
    })
  )
  .optional()
  .describe('Custom message attributes for filtering and metadata');

export let publishBatch = SlateTool.create(spec, {
  name: 'Publish Batch',
  key: 'publish_batch',
  description: `Publish up to 10 messages to a single SNS topic in one request. SNS reports success or failure for each individual batch entry, so inspect the failed array even when the request succeeds.`,
  instructions: [
    'Use unique entry IDs within the batch.',
    'For FIFO topics, each entry must include messageGroupId and either messageDeduplicationId or a topic with content-based deduplication.'
  ],
  constraints: [
    'A batch can contain at most 10 entries.',
    'The total batch payload and each individual message are limited to 256 KB.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      topicArn: z.string().describe('ARN of the topic to publish to'),
      entries: z
        .array(
          z.object({
            id: z.string().describe('Unique entry ID within this batch, max 80 characters'),
            message: z.string().describe('Message body for this entry'),
            subject: z.string().optional().describe('Subject line for email notifications'),
            messageStructure: z
              .enum(['json'])
              .optional()
              .describe('Set to "json" to send protocol-specific messages'),
            messageGroupId: z.string().optional().describe('Message group ID for FIFO topics'),
            messageDeduplicationId: z
              .string()
              .optional()
              .describe('Deduplication ID for FIFO topics'),
            messageAttributes: messageAttributesSchema
          })
        )
        .min(1)
        .max(10)
        .describe('Messages to publish in this batch')
    })
  )
  .output(
    z.object({
      successful: z
        .array(
          z.object({
            id: z.string().describe('Entry ID from the request'),
            messageId: z.string().describe('Message ID assigned by SNS'),
            sequenceNumber: z.string().optional().describe('FIFO sequence number')
          })
        )
        .describe('Entries that SNS accepted'),
      failed: z
        .array(
          z.object({
            id: z.string().describe('Entry ID from the request'),
            code: z.string().describe('SNS batch error code'),
            message: z.string().optional().describe('SNS batch error message'),
            senderFault: z.boolean().describe('Whether the failure was caused by the request')
          })
        )
        .describe('Entries that SNS rejected')
    })
  )
  .handleInvocation(async ctx => {
    let ids = new Set<string>();
    for (let entry of ctx.input.entries) {
      if (ids.has(entry.id)) {
        throw snsServiceError(`Batch entry IDs must be unique. Duplicate ID: ${entry.id}`);
      }
      ids.add(entry.id);
    }

    let client = new SnsClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let result = await client.publishBatch(ctx.input.topicArn, ctx.input.entries);

    return {
      output: result,
      message: `Published batch to \`${ctx.input.topicArn}\`: ${result.successful.length} accepted, ${result.failed.length} failed`
    };
  })
  .build();
