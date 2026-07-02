import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMessage = SlateTool.create(spec, {
  name: 'Get Message',
  key: 'get_message',
  description: `Retrieve a webhook message by Svix message ID or event ID. Optionally include the payload content for debugging or audit workflows.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID'),
      messageId: z.string().describe('Message ID or event ID'),
      includePayload: z
        .boolean()
        .optional()
        .describe('Whether to include the message payload in the response')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Svix message ID'),
      eventType: z.string().describe('Event type of the message'),
      eventId: z.string().optional().describe('Event ID if set'),
      channels: z.array(z.string()).optional().describe('Message channels'),
      tags: z.array(z.string()).optional().describe('Message tags'),
      deliverAt: z.string().nullable().optional().describe('Scheduled delivery time'),
      payload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Webhook payload when includePayload is true'),
      timestamp: z.string().describe('When the message was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Fetching message...');
    let msg = await client.getMessage(ctx.input.applicationId, ctx.input.messageId, {
      withContent: ctx.input.includePayload
    });

    return {
      output: {
        messageId: msg.id,
        eventType: msg.eventType,
        eventId: msg.eventId ?? undefined,
        channels: msg.channels ?? undefined,
        tags: msg.tags ?? undefined,
        deliverAt: msg.deliverAt,
        payload: ctx.input.includePayload ? msg.payload : undefined,
        timestamp: msg.timestamp
      },
      message: `Message \`${msg.id}\` has event type **${msg.eventType}**.`
    };
  })
  .build();

export let precheckMessage = SlateTool.create(spec, {
  name: 'Precheck Message',
  key: 'precheck_message',
  description: `Check whether a message with the given event type and channels would be sent to any active endpoint before creating it.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID'),
      eventType: z.string().describe('Event type to precheck'),
      channels: z.array(z.string()).optional().describe('Optional channel filters')
    })
  )
  .output(
    z.object({
      active: z
        .boolean()
        .describe('Whether at least one active endpoint would receive this message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Prechecking message delivery...');
    let result = await client.precheckMessage(ctx.input.applicationId, {
      eventType: ctx.input.eventType,
      channels: ctx.input.channels
    });

    return {
      output: {
        active: result.active
      },
      message: result.active
        ? `At least one active endpoint would receive **${ctx.input.eventType}**.`
        : `No active endpoint would receive **${ctx.input.eventType}**.`
    };
  })
  .build();

export let expungeMessageContent = SlateTool.create(spec, {
  name: 'Expunge Message Content',
  key: 'expunge_message_content',
  description: `Delete the stored payload for a message while preserving delivery metadata. Use this for retention and privacy workflows.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID'),
      messageId: z.string().describe('Message ID or event ID')
    })
  )
  .output(
    z.object({
      expunged: z.boolean().describe('Whether the message content was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Expunging message content...');
    await client.expungeMessageContent(ctx.input.applicationId, ctx.input.messageId);

    return {
      output: {
        expunged: true
      },
      message: `Expunged stored payload for message \`${ctx.input.messageId}\`.`
    };
  })
  .build();
