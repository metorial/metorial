import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reactionEvents = SlateTrigger.create(spec, {
  name: 'Reaction Events',
  key: 'reaction_events',
  description: 'Triggers when emoji reactions are added to or removed from messages.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      action: z.string().describe('Action: "add" or "remove"'),
      messageId: z.number().describe('Message ID the reaction is on'),
      userId: z.number().describe('User ID who added/removed the reaction'),
      emojiName: z.string().describe('Emoji name'),
      emojiCode: z.string().describe('Emoji code')
    })
  )
  .output(
    z.object({
      messageId: z.number().describe('Message ID the reaction is on'),
      userId: z.number().describe('User ID who added/removed the reaction'),
      emojiName: z.string().describe('Emoji name'),
      emojiCode: z.string().describe('Emoji code'),
      action: z.string().describe('Action: "add" or "remove"')
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
            eventTypes: ['reaction']
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
        let reactionEvents = events.filter((e: any) => e.type === 'reaction');

        let newLastEventId = events.length > 0 ? events[events.length - 1].id : lastEventId;

        let inputs = reactionEvents.map((e: any) => ({
          eventId: String(e.id),
          action: e.op,
          messageId: e.message_id,
          userId: e.user_id,
          emojiName: e.emoji_name,
          emojiCode: e.emoji_code || ''
        }));

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
        type: `reaction.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          messageId: ctx.input.messageId,
          userId: ctx.input.userId,
          emojiName: ctx.input.emojiName,
          emojiCode: ctx.input.emojiCode,
          action: ctx.input.action
        }
      };
    }
  })
  .build();
