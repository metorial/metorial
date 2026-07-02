import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recordEvent = SlateTool.create(spec, {
  name: 'Record Event',
  key: 'record_event',
  description: `Record a custom event (action) for a subscriber, such as "Signed up for a trial" or "Logged in." Events can include custom properties and an optional conversion value. Use this to track behavioral data and trigger automations.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      email: z
        .string()
        .optional()
        .describe('Subscriber email address. Either email or subscriberId must be provided.'),
      subscriberId: z
        .string()
        .optional()
        .describe('Subscriber ID. Either email or subscriberId must be provided.'),
      action: z.string().describe('The event action name, e.g. "Signed up for a trial".'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom key-value properties to attach to the event.'),
      occurredAt: z
        .string()
        .optional()
        .describe('ISO-8601 timestamp when the event occurred. Defaults to now.'),
      prospect: z.boolean().optional().describe('Whether the subscriber is a prospect.')
    })
  )
  .output(
    z.object({
      recorded: z.boolean().describe('Whether the event was recorded successfully.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    if (!ctx.input.email && !ctx.input.subscriberId) {
      throw new Error('Either email or subscriberId must be provided.');
    }

    let event: Record<string, any> = {
      action: ctx.input.action
    };
    if (ctx.input.email) event.email = ctx.input.email;
    if (ctx.input.subscriberId) event.id = ctx.input.subscriberId;
    if (ctx.input.properties) event.properties = ctx.input.properties;
    if (ctx.input.occurredAt) event.occurred_at = ctx.input.occurredAt;
    if (ctx.input.prospect !== undefined) event.prospect = ctx.input.prospect;

    await client.recordEvent(event);

    return {
      output: { recorded: true },
      message: `Event **${ctx.input.action}** recorded for **${ctx.input.email ?? ctx.input.subscriberId}**.`
    };
  })
  .build();
