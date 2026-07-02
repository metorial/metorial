import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let newEvents = SlateTrigger.create(spec, {
  name: 'New Events',
  key: 'new_events',
  description:
    '[Polling fallback] Polls for new events (tracked actions) in Klaviyo. Detects new purchases, email interactions, custom events, and other tracked activities.'
})
  .input(
    z.object({
      eventId: z.string().describe('Event ID'),
      eventName: z.string().optional().describe('Event/metric name'),
      profileId: z.string().optional().describe('Associated profile ID'),
      metricId: z.string().optional().describe('Associated metric ID'),
      timestamp: z.string().optional().describe('Event timestamp'),
      properties: z.record(z.string(), z.any()).optional().describe('Event properties'),
      value: z.number().optional().describe('Monetary value')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Event ID'),
      eventName: z.string().optional().describe('Event/metric name'),
      profileId: z.string().optional().describe('Profile ID'),
      metricId: z.string().optional().describe('Metric ID'),
      eventTimestamp: z.string().optional().describe('When the event occurred'),
      properties: z.record(z.string(), z.any()).optional().describe('Event properties'),
      value: z.number().optional().describe('Monetary value')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let state = ctx.state as { lastTimestamp?: string; lastSeenIds?: string[] } | undefined;
      let lastTimestamp = state?.lastTimestamp;
      let lastSeenIds = state?.lastSeenIds ?? [];

      let filter: string | undefined;
      if (lastTimestamp) {
        filter = `greater-than(datetime,${lastTimestamp})`;
      }

      let result = await client.getEvents({
        filter,
        sort: '-datetime',
        pageSize: 50
      });

      let newEvents = result.data.filter(e => !lastSeenIds.includes(e.id ?? ''));

      let inputs = newEvents.map(e => ({
        eventId: e.id ?? '',
        eventName: e.attributes?.event_name ?? undefined,
        profileId: e.relationships?.profile?.data?.id ?? undefined,
        metricId: e.relationships?.metric?.data?.id ?? undefined,
        timestamp: e.attributes?.datetime ?? undefined,
        properties: e.attributes?.event_properties ?? undefined,
        value: e.attributes?.value ?? undefined
      }));

      let updatedTimestamp =
        newEvents.length > 0
          ? (newEvents[0]?.attributes?.datetime ?? lastTimestamp)
          : lastTimestamp;

      let updatedSeenIds = newEvents.map(e => e.id ?? '').slice(0, 100);

      return {
        inputs,
        updatedState: {
          lastTimestamp: updatedTimestamp ?? new Date().toISOString(),
          lastSeenIds: updatedSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      let eventType = (ctx.input.eventName ?? 'unknown').toLowerCase().replace(/\s+/g, '_');

      return {
        type: `event.${eventType}`,
        id: ctx.input.eventId,
        output: {
          eventId: ctx.input.eventId,
          eventName: ctx.input.eventName,
          profileId: ctx.input.profileId,
          metricId: ctx.input.metricId,
          eventTimestamp: ctx.input.timestamp,
          properties: ctx.input.properties,
          value: ctx.input.value
        }
      };
    }
  })
  .build();
