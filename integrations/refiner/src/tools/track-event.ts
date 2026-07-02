import { SlateTool } from 'slates';
import { z } from 'zod';
import { RefinerClient } from '../lib/client';
import { spec } from '../spec';

export let trackEvent = SlateTool.create(spec, {
  name: 'Track Event',
  key: 'track_event',
  description: `Track a user event in Refiner. Event data will be merged with event data tracked through the JavaScript client library. Useful for triggering surveys based on backend events.`,
  constraints: [
    'Event tracking requires a Growth or Enterprise plan. The Essentials plan does not support user event tracking.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('External user ID of the user'),
      email: z.string().optional().describe('Email address of the user'),
      eventName: z
        .string()
        .describe('Name of the event to track (e.g. "purchased_plan", "invited_teammate")')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the event was tracked successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RefinerClient({ token: ctx.auth.token });

    await client.trackEvent({
      id: ctx.input.userId,
      email: ctx.input.email,
      event: ctx.input.eventName
    });

    let identifier = ctx.input.userId || ctx.input.email || 'unknown';

    return {
      output: { success: true },
      message: `Tracked event **"${ctx.input.eventName}"** for user **${identifier}**.`
    };
  })
  .build();
