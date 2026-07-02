import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { RuntimeClient } from '../lib/client';
import { spec } from '../spec';

export let incomingEventTrigger = SlateTrigger.create(spec, {
  name: 'Bot Event',
  key: 'bot_event',
  description:
    'Triggers when new events are received by a bot, including messages, custom events, and system events.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      eventType: z.string().describe('Type of event'),
      payload: z.record(z.string(), z.unknown()).describe('Event payload data'),
      conversationId: z.string().optional().describe('Associated conversation ID'),
      userId: z.string().optional().describe('Associated user ID'),
      status: z.string().optional().describe('Event processing status'),
      createdAt: z.string().describe('Event creation timestamp')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      eventType: z.string().describe('Type of event'),
      payload: z.record(z.string(), z.unknown()).describe('Event payload data'),
      conversationId: z.string().optional().describe('Associated conversation ID'),
      userId: z.string().optional().describe('Associated user ID'),
      status: z.string().optional().describe('Event processing status'),
      createdAt: z.string().describe('Event creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let botId = ctx.config.botId;
      if (!botId) return { inputs: [], updatedState: ctx.state };

      let client = new RuntimeClient({ token: ctx.auth.token, botId });

      let lastSeenId = ctx.state?.lastSeenId as string | undefined;
      let result = await client.listEvents();
      let events = (result.events || []) as Record<string, unknown>[];

      let newEvents = lastSeenId
        ? events.filter(
            e =>
              e.id !== lastSeenId &&
              new Date(e.createdAt as string) >
                new Date((ctx.state?.lastSeenAt as string) || '1970-01-01')
          )
        : events;

      let inputs = newEvents.map(e => ({
        eventId: e.id as string,
        eventType: e.type as string,
        payload: (e.payload || {}) as Record<string, unknown>,
        conversationId: e.conversationId as string | undefined,
        userId: e.userId as string | undefined,
        status: e.status as string | undefined,
        createdAt: e.createdAt as string
      }));

      let latestEvent = events[0];
      return {
        inputs,
        updatedState: {
          lastSeenId: latestEvent ? latestEvent.id : lastSeenId,
          lastSeenAt: latestEvent ? latestEvent.createdAt : ctx.state?.lastSeenAt
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: `event.${ctx.input.eventType.replace(/[:/]/g, '.')}`,
        id: ctx.input.eventId,
        output: {
          eventId: ctx.input.eventId,
          eventType: ctx.input.eventType,
          payload: ctx.input.payload,
          conversationId: ctx.input.conversationId,
          userId: ctx.input.userId,
          status: ctx.input.status,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
