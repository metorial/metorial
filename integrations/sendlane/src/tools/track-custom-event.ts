import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendlaneEcommerceClient } from '../lib/ecommerce-client';
import { spec } from '../spec';

export let trackCustomEvent = SlateTool.create(spec, {
  name: 'Track Custom Event',
  key: 'track_custom_event',
  description: `Send a custom event to Sendlane for tracking purposes. Custom events can be used to trigger automations and segment contacts based on custom behavior.`,
  instructions: [
    'Use the integrationToken from your Sendlane Custom Integration settings.',
    'If providing an eventId, duplicates with the same event name + ID combination will be skipped.'
  ]
})
  .input(
    z.object({
      integrationToken: z.string().describe('Sendlane Custom Integration token'),
      email: z.string().describe('Contact email address'),
      eventName: z.string().describe('Custom event name'),
      eventId: z.string().optional().describe('Unique event ID for deduplication'),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional event properties as key-value pairs')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let ecomClient = new SendlaneEcommerceClient(ctx.auth.token);

    await ecomClient.trackCustomEvent({
      token: ctx.input.integrationToken,
      email: ctx.input.email,
      eventName: ctx.input.eventName,
      eventId: ctx.input.eventId,
      properties: ctx.input.properties
    });

    return {
      output: { success: true },
      message: `Tracked custom event **${ctx.input.eventName}** for ${ctx.input.email}.`
    };
  })
  .build();
