import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DeadlineFunnelClient } from '../lib/client';
import { spec } from '../spec';

export let newCustomEvent = SlateTrigger.create(spec, {
  name: 'New Custom Event',
  key: 'new_custom_event',
  description:
    'Triggers when a new custom event is created in Deadline Funnel. Custom events can be used for social proof and analytics tracking.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique identifier of the custom event'),
      eventName: z.string().describe('Name of the custom event'),
      email: z.string().describe('Email of the contact associated with the event'),
      createdAt: z.string().describe('When the custom event was created')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Unique identifier of the custom event'),
      eventName: z.string().describe('Name of the custom event'),
      email: z.string().describe('Email of the contact associated with the event'),
      createdAt: z.string().describe('When the custom event was created')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new DeadlineFunnelClient({ token: ctx.auth.token });
      let lastTimestamp = (ctx.state as any)?.lastTimestamp || '';

      let events = await client.listCustomEvents({
        since: lastTimestamp || undefined
      });

      let inputs = events.map(e => ({
        eventId: e.eventId,
        eventName: e.name,
        email: e.email,
        createdAt: e.createdAt
      }));

      let newLastTimestamp = events.length > 0 ? events[0]!.createdAt : lastTimestamp;

      return {
        inputs,
        updatedState: {
          lastTimestamp: newLastTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'custom_event.created',
        id: ctx.input.eventId,
        output: {
          eventId: ctx.input.eventId,
          eventName: ctx.input.eventName,
          email: ctx.input.email,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
