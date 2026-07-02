import { SlateTool } from 'slates';
import { z } from 'zod';
import { BackendlessClient } from '../lib/client';
import { spec } from '../spec';

export let publishMessage = SlateTool.create(spec, {
  name: 'Publish Message',
  key: 'publish_message',
  description: `Publishes a message to a Backendless messaging channel for pub/sub delivery. Supports immediate delivery, scheduled delivery, and recurring messages. Subscribers to the channel will receive the message across platforms.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channelName: z.string().describe('Name of the messaging channel to publish to'),
      message: z
        .unknown()
        .describe('Message content to publish (string, number, object, or array)'),
      publisherId: z.string().optional().describe('Identifier of the message publisher'),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom headers for message filtering by subscribers'),
      publishAt: z
        .number()
        .optional()
        .describe('Timestamp (milliseconds) to schedule future delivery'),
      repeatEvery: z
        .number()
        .optional()
        .describe('Interval in seconds for recurring delivery'),
      repeatExpiresAt: z
        .number()
        .optional()
        .describe('Timestamp (milliseconds) when recurring delivery should stop')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique identifier for the published message'),
      status: z.string().describe('Publication status (e.g. "scheduled")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BackendlessClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      region: ctx.config.region
    });

    let result = await client.publishMessage(ctx.input.channelName, ctx.input.message, {
      publisherId: ctx.input.publisherId,
      headers: ctx.input.headers,
      publishAt: ctx.input.publishAt,
      repeatEvery: ctx.input.repeatEvery,
      repeatExpiresAt: ctx.input.repeatExpiresAt
    });

    return {
      output: {
        messageId: result.messageId,
        status: result.status
      },
      message: `Published message to channel **${ctx.input.channelName}** (ID: ${result.messageId}, status: ${result.status}).`
    };
  })
  .build();
