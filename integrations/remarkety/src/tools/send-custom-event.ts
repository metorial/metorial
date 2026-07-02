import { SlateTool } from 'slates';
import { z } from 'zod';
import { RemarketyClient } from '../lib/client';
import { spec } from '../spec';

export let sendCustomEventTool = SlateTool.create(spec, {
  name: 'Send Custom Event',
  key: 'send_custom_event',
  description: `Send a custom event to Remarkety to trigger automations. Custom events support arbitrary properties (e.g., site searches, room bookings, loyalty milestones) that can be used to trigger automations. Note that custom events do not support advanced eCommerce analytics.`,
  instructions: [
    'Use built-in event types (customers/*, orders/*, products/*, carts/*, newsletter/*) for eCommerce data instead of custom events.',
    'Custom event types should follow the format "category/action" (e.g., "search/performed", "booking/created").'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Custom event type (e.g., "search/performed", "booking/created")'),
      email: z.string().optional().describe('Associated contact email address'),
      properties: z
        .record(z.string(), z.unknown())
        .describe('Custom event properties as key-value pairs')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the event was sent successfully'),
      eventType: z.string().describe('The event type that was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RemarketyClient({
      token: ctx.auth.token,
      storeId: ctx.auth.storeId,
      storeDomain: ctx.config.storeDomain,
      platform: ctx.config.platform
    });

    let payload: Record<string, unknown> = { ...ctx.input.properties };
    if (ctx.input.email) {
      payload.email = ctx.input.email;
    }

    ctx.info(`Sending custom event "${ctx.input.eventType}"`);

    await client.sendCustomEvent(ctx.input.eventType, payload);

    return {
      output: {
        success: true,
        eventType: ctx.input.eventType
      },
      message: `Successfully sent custom event **${ctx.input.eventType}**${ctx.input.email ? ` for **${ctx.input.email}**` : ''}.`
    };
  })
  .build();
