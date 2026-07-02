import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

export let trackEvent = SlateTool.create(spec, {
  name: 'Track Event',
  key: 'track_event',
  description: `Track a custom event for a contact in Gist. Events record product interactions like "Clicked Signup Button" or "Viewed Pricing Page". Identify the contact by email or user ID.`,
  instructions: [
    'Event names are case-insensitive. Periods and dollars in names are replaced with hyphens.'
  ]
})
  .input(
    z.object({
      email: z.string().optional().describe('Contact email address'),
      userId: z.string().optional().describe('Contact user ID'),
      eventName: z.string().describe('Name of the event to track'),
      eventProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional properties for the event'),
      occurredAt: z
        .string()
        .optional()
        .describe('When the event occurred (UNIX timestamp). Defaults to now')
    })
  )
  .output(
    z.object({
      tracked: z.boolean().describe('Whether the event was successfully tracked')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    let body: Record<string, any> = {
      name: ctx.input.eventName
    };
    if (ctx.input.email) body.email = ctx.input.email;
    if (ctx.input.userId) body.user_id = ctx.input.userId;
    if (ctx.input.eventProperties) body.properties = ctx.input.eventProperties;
    if (ctx.input.occurredAt) body.occurred_at = ctx.input.occurredAt;

    await client.trackEvent(body);

    return {
      output: { tracked: true },
      message: `Tracked event **${ctx.input.eventName}** for contact ${ctx.input.email || ctx.input.userId}.`
    };
  })
  .build();
