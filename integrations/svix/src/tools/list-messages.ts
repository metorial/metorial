import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `List webhook messages sent to an application. Filter by event type, channel, or time range. Use this to audit message history or debug delivery issues.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID'),
      limit: z.number().optional().describe('Maximum number of messages to return'),
      iterator: z.string().optional().describe('Pagination cursor from a previous request'),
      order: z
        .enum(['ascending', 'descending'])
        .optional()
        .describe('Sort order for returned messages'),
      channel: z.string().optional().describe('Filter by channel'),
      before: z
        .string()
        .optional()
        .describe('Only return messages created before this ISO timestamp'),
      after: z
        .string()
        .optional()
        .describe('Only return messages created after this ISO timestamp'),
      eventTypes: z.array(z.string()).optional().describe('Filter by event types'),
      tag: z.string().optional().describe('Filter by tag'),
      includePayload: z
        .boolean()
        .optional()
        .describe('Whether to include each message payload in the response')
    })
  )
  .output(
    z.object({
      messages: z.array(
        z.object({
          messageId: z.string().describe('Svix message ID'),
          eventType: z.string().describe('Event type of the message'),
          eventId: z.string().optional().describe('Event ID if set'),
          channels: z
            .array(z.string())
            .optional()
            .describe('Channels the message was tagged with'),
          tags: z.array(z.string()).optional().describe('Message tags'),
          deliverAt: z.string().nullable().optional().describe('Scheduled delivery time'),
          payload: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Webhook payload when includePayload is true'),
          timestamp: z.string().describe('When the message was created')
        })
      ),
      hasMore: z.boolean().describe('Whether there are more results'),
      iterator: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Fetching messages...');
    let result = await client.listMessages(ctx.input.applicationId, {
      limit: ctx.input.limit,
      iterator: ctx.input.iterator,
      order: ctx.input.order,
      channel: ctx.input.channel,
      before: ctx.input.before,
      after: ctx.input.after,
      eventTypes: ctx.input.eventTypes,
      tag: ctx.input.tag,
      withContent: ctx.input.includePayload
    });

    let messages = result.data.map(msg => ({
      messageId: msg.id,
      eventType: msg.eventType,
      eventId: msg.eventId ?? undefined,
      channels: msg.channels ?? undefined,
      tags: msg.tags ?? undefined,
      deliverAt: msg.deliverAt,
      payload: ctx.input.includePayload ? msg.payload : undefined,
      timestamp: msg.timestamp
    }));

    return {
      output: {
        messages,
        hasMore: !result.done,
        iterator: result.iterator ?? undefined
      },
      message: `Found **${messages.length}** message(s) for application \`${ctx.input.applicationId}\`.`
    };
  })
  .build();
