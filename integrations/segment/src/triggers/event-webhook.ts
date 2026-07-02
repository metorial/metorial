import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let eventWebhookTrigger = SlateTrigger.create(spec, {
  name: 'Incoming Events',
  key: 'incoming_events',
  description:
    'Receives Segment tracking events (identify, track, page, screen, group, alias) via webhook. Configure this URL as a Segment Webhooks destination to forward events.'
})
  .input(
    z.object({
      messageId: z.string().describe('Unique message ID for deduplication'),
      type: z.string().describe('Event type (identify, track, page, screen, group, alias)'),
      userId: z.string().optional().describe('User ID'),
      anonymousId: z.string().optional().describe('Anonymous ID'),
      event: z.string().optional().describe('Event name (for track events)'),
      properties: z.record(z.string(), z.any()).optional().describe('Event properties'),
      traits: z.record(z.string(), z.any()).optional().describe('User/group traits'),
      groupId: z.string().optional().describe('Group ID'),
      previousId: z.string().optional().describe('Previous ID (for alias)'),
      name: z.string().optional().describe('Page/screen name'),
      category: z.string().optional().describe('Page/screen category'),
      context: z.record(z.string(), z.any()).optional().describe('Context object'),
      timestamp: z.string().optional().describe('Event timestamp'),
      receivedAt: z.string().optional().describe('When Segment received the event'),
      sentAt: z.string().optional().describe('When the client sent the event')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique message ID'),
      eventType: z
        .string()
        .describe('Event type (identify, track, page, screen, group, alias)'),
      userId: z.string().optional().describe('User ID'),
      anonymousId: z.string().optional().describe('Anonymous ID'),
      eventName: z.string().optional().describe('Event name (for track events)'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Event properties (track, page, screen)'),
      traits: z
        .record(z.string(), z.any())
        .optional()
        .describe('User/group traits (identify, group)'),
      groupId: z.string().optional().describe('Group ID (for group events)'),
      previousId: z.string().optional().describe('Previous ID (for alias events)'),
      pageName: z.string().optional().describe('Page/screen name'),
      pageCategory: z.string().optional().describe('Page/screen category'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data?.type) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            messageId:
              data.messageId ?? data._metadata?.messageId ?? `${data.type}-${Date.now()}`,
            type: data.type,
            userId: data.userId,
            anonymousId: data.anonymousId,
            event: data.event,
            properties: data.properties,
            traits: data.traits,
            groupId: data.groupId,
            previousId: data.previousId,
            name: data.name,
            category: data.category,
            context: data.context,
            timestamp: data.timestamp,
            receivedAt: data.receivedAt,
            sentAt: data.sentAt
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.type;
      let eventName = ctx.input.event;

      let outputType = eventType;
      if (eventType === 'track' && eventName) {
        outputType = `track.${eventName.toLowerCase().replace(/\s+/g, '_')}`;
      }

      return {
        type: outputType,
        id: ctx.input.messageId,
        output: {
          messageId: ctx.input.messageId,
          eventType: ctx.input.type,
          userId: ctx.input.userId,
          anonymousId: ctx.input.anonymousId,
          eventName: ctx.input.event,
          properties: ctx.input.properties,
          traits: ctx.input.traits,
          groupId: ctx.input.groupId,
          previousId: ctx.input.previousId,
          pageName: ctx.input.name,
          pageCategory: ctx.input.category,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
