import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newEvent = SlateTrigger.create(spec, {
  name: 'New Event',
  key: 'new_event',
  description: 'Triggers when a new event is created in your Evenium account.'
})
  .input(
    z.object({
      eventId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      startDate: z.string(),
      endDate: z.string().optional(),
      creationDate: z.string().optional(),
      status: z.string().optional(),
      url: z.string().optional()
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      title: z.string().describe('Event title'),
      description: z.string().optional().describe('Event description'),
      startDate: z.string().describe('Event start date (RFC 3339)'),
      endDate: z.string().optional().describe('Event end date (RFC 3339)'),
      creationDate: z.string().optional().describe('Event creation date (RFC 3339)'),
      status: z.string().optional().describe('Event status'),
      url: z.string().optional().describe('Event URL')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client(ctx.auth.token);
      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownEventIds = (ctx.state?.knownEventIds as string[] | undefined) ?? [];

      let result = await client.listEvents({
        since: lastPollTime
      });

      let newEvents = result.events.filter(e => !knownEventIds.includes(e.id));

      let updatedKnownIds = [...new Set([...knownEventIds, ...result.events.map(e => e.id)])];

      return {
        inputs: newEvents.map(e => ({
          eventId: e.id,
          title: e.title,
          description: e.description,
          startDate: e.startDate,
          endDate: e.endDate,
          creationDate: e.creationDate,
          status: e.status,
          url: e.url
        })),
        updatedState: {
          lastPollTime: new Date().toISOString(),
          knownEventIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'event.created',
        id: ctx.input.eventId,
        output: {
          eventId: ctx.input.eventId,
          title: ctx.input.title,
          description: ctx.input.description,
          startDate: ctx.input.startDate,
          endDate: ctx.input.endDate,
          creationDate: ctx.input.creationDate,
          status: ctx.input.status,
          url: ctx.input.url
        }
      };
    }
  })
  .build();
