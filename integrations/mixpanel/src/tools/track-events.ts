import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  createClientFromContext,
  requireNonEmptyStringArray,
  requireProjectToken
} from '../lib/helpers';
import { spec } from '../spec';

export let trackEvents = SlateTool.create(spec, {
  name: 'Track Events',
  key: 'track_events',
  description: `Send real-time events to Mixpanel from your application. Only accepts events within the last 5 days. For older/historical events, use Import Events instead.`,
  constraints: [
    'Only events within the last 5 days are accepted.',
    'Requires a project token.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      events: z
        .array(
          z.object({
            eventName: z.string().describe('Name of the event'),
            distinctId: z.string().describe('Unique identifier for the user'),
            time: z
              .number()
              .optional()
              .describe('Unix timestamp in seconds (defaults to current time)'),
            insertId: z.string().optional().describe('Unique ID for deduplication'),
            properties: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Additional custom properties')
          })
        )
        .describe('Array of events to track')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the events were accepted')
    })
  )
  .handleInvocation(async ctx => {
    requireProjectToken(ctx);
    requireNonEmptyStringArray(
      ctx.input.events.map(event => event.eventName),
      'events'
    );

    let client = createClientFromContext(ctx);

    let events = ctx.input.events.map(e => ({
      event: e.eventName,
      properties: {
        token: ctx.auth.projectToken ?? '',
        distinct_id: e.distinctId,
        ...(e.time !== undefined ? { time: e.time } : {}),
        ...(e.insertId ? { $insert_id: e.insertId } : {}),
        ...(e.properties ?? {})
      }
    }));

    let result = await client.trackEvents(events);

    return {
      output: { success: result.success },
      message: result.success
        ? `Successfully tracked **${events.length}** event(s).`
        : `Failed to track events.`
    };
  })
  .build();
