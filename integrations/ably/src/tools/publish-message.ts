import { SlateTool } from 'slates';
import { z } from 'zod';
import { AblyRestClient } from '../lib/client';
import { spec } from '../spec';

export let publishMessage = SlateTool.create(spec, {
  name: 'Publish Message',
  key: 'publish_message',
  description: `Publish one or more messages to an Ably channel. Supports publishing a single message to a channel or batch publishing multiple messages to one or more channels simultaneously.
Use batch mode by providing multiple channel-message pairs for efficient multi-channel publishing.`,
  instructions: [
    'Requires API Key authentication (not Control API token).',
    'For batch publishing, provide the "batch" array instead of individual channel/message fields.'
  ],
  constraints: [
    'Maximum message size: 64 KiB (16 KiB for free accounts)',
    'Batch requests: max 100 channels per spec, max 1000 messages per spec, max 2 MiB total body'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channelId: z
        .string()
        .optional()
        .describe('Channel name to publish to. Required for single message publishing.'),
      name: z.string().optional().describe('Event name for the message'),
      messageData: z
        .any()
        .optional()
        .describe('Message payload (string, JSON object, or binary data)'),
      clientId: z.string().optional().describe('Client ID to associate with the message'),
      messageId: z
        .string()
        .optional()
        .describe(
          'Unique message ID for idempotent publishing. If not provided, Ably generates one.'
        ),
      extras: z
        .record(z.string(), z.any())
        .optional()
        .describe('Extra message metadata, e.g. push notification configuration'),
      batch: z
        .array(
          z.object({
            channels: z
              .union([z.string(), z.array(z.string())])
              .describe('One or more channel names to publish to'),
            messages: z
              .union([
                z.object({
                  name: z.string().optional(),
                  data: z.any().optional(),
                  clientId: z.string().optional(),
                  id: z.string().optional()
                }),
                z.array(
                  z.object({
                    name: z.string().optional(),
                    data: z.any().optional(),
                    clientId: z.string().optional(),
                    id: z.string().optional()
                  })
                )
              ])
              .describe('One or more messages to publish')
          })
        )
        .optional()
        .describe(
          'Batch publish specs. If provided, channelId and other single-message fields are ignored.'
        )
    })
  )
  .output(
    z.object({
      channel: z
        .string()
        .optional()
        .describe('Channel the message was published to (single mode)'),
      messageId: z.string().optional().describe('Server-assigned message ID (single mode)'),
      batchResults: z.array(z.any()).optional().describe('Results for each batch publish spec')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AblyRestClient(ctx.auth.token);

    if (ctx.input.batch && ctx.input.batch.length > 0) {
      let batchSpecs = ctx.input.batch.map((spec, index) => {
        if (spec.channels === undefined || spec.messages === undefined) {
          throw new Error(`batch[${index}] requires both "channels" and "messages".`);
        }
        return {
          channels: spec.channels,
          messages: spec.messages
        };
      });
      let results = await client.batchPublish(batchSpecs);
      return {
        output: {
          batchResults: results
        },
        message: `Batch published messages to ${ctx.input.batch.length} channel spec(s).`
      };
    }

    if (!ctx.input.channelId) {
      throw new Error(
        'channelId is required for single message publishing. Use batch array for batch publishing.'
      );
    }

    let result = await client.publishMessage(ctx.input.channelId, {
      name: ctx.input.name,
      data: ctx.input.messageData,
      clientId: ctx.input.clientId,
      id: ctx.input.messageId,
      extras: ctx.input.extras
    });

    return {
      output: {
        channel: result.channel,
        messageId: result.messageId
      },
      message: `Published message to channel **${ctx.input.channelId}**${ctx.input.name ? ` with event name "${ctx.input.name}"` : ''}.`
    };
  })
  .build();
