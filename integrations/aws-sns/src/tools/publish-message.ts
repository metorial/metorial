import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { spec } from '../spec';

export let publishMessage = SlateTool.create(spec, {
  name: 'Publish Message',
  key: 'publish_message',
  description: `Publish a message to an SNS topic, directly to a phone number via SMS, or to a mobile platform endpoint. Supports protocol-specific messages via JSON message structure, message attributes, and FIFO topic ordering/deduplication.`,
  instructions: [
    'Provide exactly one of topicArn, targetArn, or phoneNumber.',
    'For protocol-specific messages, set messageStructure to "json" and provide a JSON object with protocol keys (default, email, sms, etc.) as the message.',
    'For FIFO topics, messageGroupId is required.'
  ],
  constraints: [
    'Message size limit: 256 KB (UTF-8 encoded).',
    'SMS messages: 140 bytes per message, 1,600 characters total.',
    'Subject: max 100 characters, no line breaks.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      topicArn: z.string().optional().describe('ARN of the topic to publish to'),
      targetArn: z
        .string()
        .optional()
        .describe('ARN of a mobile platform endpoint or application'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Phone number in E.164 format for direct SMS'),
      message: z
        .string()
        .describe(
          'The message content. If messageStructure is "json", this must be a JSON object with protocol-specific messages'
        ),
      subject: z
        .string()
        .optional()
        .describe('Subject line for email notifications (max 100 chars)'),
      messageStructure: z
        .enum(['json'])
        .optional()
        .describe('Set to "json" to send protocol-specific messages'),
      messageGroupId: z
        .string()
        .optional()
        .describe('Message group ID for FIFO topics (required for FIFO)'),
      messageDeduplicationId: z
        .string()
        .optional()
        .describe('Deduplication ID for FIFO topics'),
      messageAttributes: z
        .record(
          z.string(),
          z.object({
            dataType: z.string().describe('Data type: String, Number, or Binary'),
            stringValue: z.string().optional().describe('String or Number value'),
            binaryValue: z.string().optional().describe('Base64-encoded binary value')
          })
        )
        .optional()
        .describe('Custom message attributes for filtering and metadata')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique identifier assigned to the published message'),
      sequenceNumber: z.string().optional().describe('Sequence number for FIFO topics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnsClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let result = await client.publish({
      topicArn: ctx.input.topicArn,
      targetArn: ctx.input.targetArn,
      phoneNumber: ctx.input.phoneNumber,
      message: ctx.input.message,
      subject: ctx.input.subject,
      messageStructure: ctx.input.messageStructure,
      messageGroupId: ctx.input.messageGroupId,
      messageDeduplicationId: ctx.input.messageDeduplicationId,
      messageAttributes: ctx.input.messageAttributes as
        | Record<string, { dataType: string; stringValue?: string; binaryValue?: string }>
        | undefined
    });

    let target =
      ctx.input.topicArn || ctx.input.targetArn || ctx.input.phoneNumber || 'unknown';
    return {
      output: result,
      message: `Published message \`${result.messageId}\` to \`${target}\``
    };
  })
  .build();
