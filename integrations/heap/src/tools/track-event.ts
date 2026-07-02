import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeapClient } from '../lib/client';
import { spec } from '../spec';

let eventSchema = z.object({
  identity: z
    .string()
    .optional()
    .describe('User identity (e.g., email). Provide either identity or userId, not both.'),
  userId: z
    .string()
    .optional()
    .describe(
      'Heap user ID from the SDK. Must be a string representation of a number between 0 and 2^53 - 1. Provide either identity or userId, not both.'
    ),
  event: z.string().describe('Name of the custom event. Limited to 1024 characters.'),
  properties: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .describe(
      'Key-value pairs of event properties. Keys must be under 512 characters, values must be under 1024 characters.'
    ),
  timestamp: z
    .string()
    .optional()
    .describe(
      'ISO 8601 timestamp for the event (e.g., "2024-01-15T10:30:00+00:00"). Defaults to the current time.'
    ),
  idempotencyKey: z
    .string()
    .optional()
    .describe(
      'Unique key to prevent duplicate event ingestion. Subsequent calls with the same key are ignored.'
    ),
  sessionId: z
    .string()
    .optional()
    .describe('Session identifier to associate the event with a specific user session.')
});

export let trackEvent = SlateTool.create(spec, {
  name: 'Track Event',
  key: 'track_event',
  description: `Send custom server-side events to Heap. Supports both single event tracking and bulk event ingestion (up to 1000 events per request).
Use this for events that need to exactly match your backend data, such as completed transactions, or events not available for client-side capture.`,
  instructions: [
    'Provide either **identity** or **userId** for each event, never both.',
    'For bulk tracking, use the **events** array. For a single event, use the top-level fields.',
    'Use **idempotencyKey** to safely retry requests without creating duplicate events.'
  ],
  constraints: [
    'Single event: 30 requests per 30 seconds per identity per app_id.',
    'Bulk: Max 1000 events per request; 1000 events/minute per identity; 15,000 events/minute per app_id.',
    'Event name limited to 1024 characters. Property keys under 512 characters, values under 1024 characters.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      identity: z
        .string()
        .optional()
        .describe(
          'User identity for a single event. Provide either this or userId, not both.'
        ),
      userId: z
        .string()
        .optional()
        .describe(
          'Heap user ID for a single event. Provide either this or identity, not both.'
        ),
      event: z.string().optional().describe('Event name for a single event.'),
      properties: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe('Properties for a single event.'),
      timestamp: z.string().optional().describe('ISO 8601 timestamp for a single event.'),
      idempotencyKey: z.string().optional().describe('Idempotency key for a single event.'),
      sessionId: z.string().optional().describe('Session ID for a single event.'),
      events: z
        .array(eventSchema)
        .optional()
        .describe('Array of events for bulk tracking. Max 1000 events per request.')
    })
  )
  .output(
    z.object({
      tracked: z.number().describe('Number of events successfully sent to Heap.'),
      mode: z
        .enum(['single', 'bulk'])
        .describe('Whether the request was processed as a single event or bulk.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeapClient({
      appId: ctx.auth.appId,
      apiKey: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    if (ctx.input.events && ctx.input.events.length > 0) {
      ctx.info(`Bulk tracking ${ctx.input.events.length} events`);
      await client.bulkTrackEvents(ctx.input.events);

      return {
        output: {
          tracked: ctx.input.events.length,
          mode: 'bulk' as const
        },
        message: `Successfully sent **${ctx.input.events.length}** events to Heap in bulk.`
      };
    }

    if (!ctx.input.event) {
      throw new Error(
        'Either "event" (for single tracking) or "events" (for bulk tracking) must be provided.'
      );
    }

    ctx.info(`Tracking single event: ${ctx.input.event}`);
    await client.trackEvent({
      identity: ctx.input.identity,
      userId: ctx.input.userId,
      event: ctx.input.event,
      properties: ctx.input.properties,
      timestamp: ctx.input.timestamp,
      idempotencyKey: ctx.input.idempotencyKey,
      sessionId: ctx.input.sessionId
    });

    return {
      output: {
        tracked: 1,
        mode: 'single' as const
      },
      message: `Successfully tracked event **"${ctx.input.event}"** for user ${ctx.input.identity || ctx.input.userId}.`
    };
  })
  .build();
