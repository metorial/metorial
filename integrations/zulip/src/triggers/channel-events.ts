import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let channelEvents = SlateTrigger.create(spec, {
  name: 'Channel Events',
  key: 'channel_events',
  description: 'Triggers when channels are created, updated, or archived in Zulip.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      eventType: z.string().describe('Event type: "created", "updated", or "archived"'),
      channelId: z.number().describe('Channel ID'),
      channelName: z.string().describe('Channel name'),
      description: z.string().optional().describe('Channel description'),
      isPrivate: z.boolean().optional().describe('Whether the channel is private')
    })
  )
  .output(
    z.object({
      channelId: z.number().describe('Channel ID'),
      channelName: z.string().describe('Channel name'),
      description: z.string().optional().describe('Channel description'),
      isPrivate: z.boolean().optional().describe('Whether the channel is private')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        serverUrl: ctx.auth.serverUrl,
        email: ctx.auth.email,
        token: ctx.auth.token
      });

      let state = ctx.state as { queueId?: string; lastEventId?: number } | undefined;

      let queueId = state?.queueId;
      let lastEventId = state?.lastEventId ?? -1;

      if (!queueId) {
        try {
          let registration = await client.registerEventQueue({
            eventTypes: ['stream']
          });
          queueId = registration.queue_id;
          lastEventId = registration.last_event_id;
        } catch (_err) {
          ctx.error('Failed to register event queue');
          return { inputs: [], updatedState: {} };
        }
      }

      try {
        let eventsResult = await client.getEvents({
          queueId: queueId!,
          lastEventId,
          dontBlock: true
        });

        let events = eventsResult.events || [];
        let streamEvents = events.filter((e: any) => e.type === 'stream');

        let newLastEventId = events.length > 0 ? events[events.length - 1].id : lastEventId;

        let inputs = streamEvents.map((e: any) => {
          let stream = e.streams?.[0] || e.stream || {};
          let eventType = e.op || 'updated';

          return {
            eventId: String(e.id),
            eventType:
              eventType === 'create'
                ? 'created'
                : eventType === 'delete'
                  ? 'archived'
                  : 'updated',
            channelId: stream.stream_id ?? 0,
            channelName: stream.name ?? '',
            description: stream.description,
            isPrivate: stream.invite_only
          };
        });

        return {
          inputs,
          updatedState: {
            queueId,
            lastEventId: newLastEventId
          }
        };
      } catch (err: any) {
        if (
          err?.response?.status === 400 &&
          err?.response?.data?.code === 'BAD_EVENT_QUEUE_ID'
        ) {
          ctx.warn('Event queue expired, will re-register on next poll');
          return { inputs: [], updatedState: {} };
        }
        throw err;
      }
    },

    handleEvent: async ctx => {
      return {
        type: `channel.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          channelId: ctx.input.channelId,
          channelName: ctx.input.channelName,
          description: ctx.input.description,
          isPrivate: ctx.input.isPrivate
        }
      };
    }
  })
  .build();
