import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let trackEvent = SlateTool.create(spec, {
  name: 'Track Event',
  key: 'track_event',
  description: `Tracks a custom event for a user in Engage. Events can be used for user segmentation, triggering automation workflows, and tracking user behavior. Supports events with a single value, multiple properties, or just an event name.`,
  instructions: [
    'Use "value" for simple events with a single metric (e.g., payment amount).',
    'Use "properties" for events with multiple data points (e.g., product details).',
    'You can send just an event name for simple action tracking.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      uid: z.string().describe('The unique user identifier'),
      event: z
        .string()
        .describe('Event name/title (e.g., "Purchased", "Signed Up", "Completed KYC")'),
      value: z
        .union([z.string(), z.number(), z.boolean()])
        .optional()
        .describe('Single event value'),
      properties: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe('Key-value pairs of event properties'),
      timestamp: z
        .string()
        .optional()
        .describe('Event timestamp (ISO 8601 format). Defaults to current time if omitted.')
    })
  )
  .output(
    z.object({
      tracked: z.boolean().describe('Whether the event was tracked successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret
    });

    await client.trackEvent(ctx.input.uid, {
      event: ctx.input.event,
      value: ctx.input.value,
      properties: ctx.input.properties as
        | Record<string, string | number | boolean>
        | undefined,
      timestamp: ctx.input.timestamp
    });

    return {
      output: {
        tracked: true
      },
      message: `Tracked event **"${ctx.input.event}"** for user **${ctx.input.uid}**.`
    };
  })
  .build();
