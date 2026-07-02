import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { TwitterClient } from '../lib/client';
import { dmEventSchema, mapDmEvent } from '../lib/helpers';
import { spec } from '../spec';

export let newDirectMessage = SlateTrigger.create(spec, {
  name: 'New Direct Message',
  key: 'new_direct_message',
  description: 'Triggers when the authenticated user receives a new direct message.'
})
  .input(
    z.object({
      eventId: z.string().describe('ID of the DM event'),
      text: z.string().optional().describe('Message text'),
      senderId: z.string().optional().describe('User ID of the sender'),
      conversationId: z.string().optional().describe('DM conversation ID'),
      eventType: z.string().optional().describe('Type of DM event'),
      createdAt: z.string().optional().describe('ISO 8601 timestamp')
    })
  )
  .output(dmEventSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new TwitterClient(ctx.auth.token);

      let result = await client.getDmEvents({ maxResults: 20 });
      let events = (result.data || []).map(mapDmEvent);

      let lastSeenId = ctx.state?.lastSeenId;
      let newEvents = lastSeenId ? events.filter((e: any) => e.eventId > lastSeenId) : [];

      let newestId = events.length > 0 ? events[0].eventId : lastSeenId;

      let inputs = newEvents.map((e: any) => ({
        eventId: e.eventId,
        text: e.text,
        senderId: e.senderId,
        conversationId: e.conversationId,
        eventType: e.eventType,
        createdAt: e.createdAt
      }));

      return {
        inputs,
        updatedState: {
          lastSeenId: newestId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'dm.received',
        id: ctx.input.eventId,
        output: {
          eventId: ctx.input.eventId,
          text: ctx.input.text,
          senderId: ctx.input.senderId,
          conversationId: ctx.input.conversationId,
          eventType: ctx.input.eventType,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
