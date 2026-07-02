import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let newEventsTrigger = SlateTrigger.create(spec, {
  name: 'New Events',
  key: 'new_events',
  description:
    'Triggers when new events are captured in PostHog. Polls for recent events using HogQL queries and deduplicates based on event UUID.'
})
  .input(
    z.object({
      eventUuid: z.string().describe('Unique event UUID'),
      eventName: z.string().describe('Event name'),
      distinctId: z.string().describe('Distinct ID of the user'),
      timestamp: z.string().describe('Event timestamp'),
      properties: z.record(z.string(), z.any()).optional().describe('Event properties')
    })
  )
  .output(
    z.object({
      eventUuid: z.string().describe('Unique event UUID'),
      eventName: z.string().describe('Name of the event'),
      distinctId: z.string().describe('Distinct ID of the user who triggered the event'),
      timestamp: z.string().describe('ISO 8601 timestamp of the event'),
      properties: z.record(z.string(), z.any()).optional().describe('Event properties')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx.config, ctx.auth);

      let lastTimestamp =
        ctx.state?.lastTimestamp || new Date(Date.now() - 60000).toISOString();

      let result = await client.runQuery({
        kind: 'HogQLQuery',
        query: `SELECT uuid, event, distinct_id, timestamp, properties FROM events WHERE timestamp > toDateTime('${lastTimestamp}') ORDER BY timestamp DESC LIMIT 100`
      });

      let rows = result.results || [];
      let inputs = rows.map((row: any[]) => ({
        eventUuid: String(row[0]),
        eventName: String(row[1]),
        distinctId: String(row[2]),
        timestamp: String(row[3]),
        properties: typeof row[4] === 'string' ? JSON.parse(row[4]) : row[4] || {}
      }));

      let newLastTimestamp = inputs.length > 0 ? inputs[0]!.timestamp : lastTimestamp;

      return {
        inputs,
        updatedState: {
          lastTimestamp: newLastTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `event.${ctx.input.eventName.replace(/^\$/, '').toLowerCase()}`,
        id: ctx.input.eventUuid,
        output: {
          eventUuid: ctx.input.eventUuid,
          eventName: ctx.input.eventName,
          distinctId: ctx.input.distinctId,
          timestamp: ctx.input.timestamp,
          properties: ctx.input.properties
        }
      };
    }
  })
  .build();
