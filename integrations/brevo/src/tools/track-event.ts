import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let trackEvent = SlateTool.create(spec, {
  name: 'Track Event',
  key: 'track_event',
  description: `Track a custom event for a contact in Brevo. Events can be used for segmentation, automation triggers, and personalization.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z
        .string()
        .optional()
        .describe('Email address of the contact to associate the event with'),
      eventName: z.string().describe('Name of the event to track'),
      eventData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Structured event data (key-value pairs)'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional properties for the event')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the event was tracked successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.trackEvent({
      email: ctx.input.email,
      eventName: ctx.input.eventName,
      eventData: ctx.input.eventData,
      properties: ctx.input.properties
    });

    return {
      output: { success: true },
      message: `Event **${ctx.input.eventName}** tracked${ctx.input.email ? ` for ${ctx.input.email}` : ''}.`
    };
  });
