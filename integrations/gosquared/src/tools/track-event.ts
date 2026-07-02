import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoSquaredClient } from '../lib/client';
import { spec } from '../spec';

export let trackEvent = SlateTool.create(spec, {
  name: 'Track Event',
  key: 'track_event',
  description: `Track a custom event in GoSquared. Events can represent user actions, application errors, state transitions, or any activity. Events appear in Trends and on individual user profiles in People CRM.`,
  constraints: [
    'Each project can track up to 1000 unique custom event names. Events with new names beyond this limit will be ignored.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      eventName: z.string().describe('Name of the event to track'),
      eventProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional properties/data for the event'),
      personId: z
        .string()
        .optional()
        .describe(
          'Person ID to associate the event with (use "email:user@example.com" format)'
        ),
      visitorId: z
        .string()
        .optional()
        .describe('Anonymous visitor ID to associate the event with'),
      timestamp: z
        .string()
        .optional()
        .describe('Event timestamp in ISO 8601 format. Defaults to now.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the event was tracked successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({
      token: ctx.auth.token,
      siteToken: ctx.config.siteToken
    });

    await client.trackEvent({
      name: ctx.input.eventName,
      data: ctx.input.eventProperties,
      personId: ctx.input.personId,
      visitorId: ctx.input.visitorId,
      timestamp: ctx.input.timestamp
    });

    return {
      output: { success: true },
      message: `Successfully tracked event **${ctx.input.eventName}**.`
    };
  })
  .build();
