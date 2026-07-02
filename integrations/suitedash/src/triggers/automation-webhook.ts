import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let automationWebhook = SlateTrigger.create(spec, {
  name: 'Automation Webhook',
  key: 'automation_webhook',
  description:
    "Triggers on custom automation events from SuiteDash's no-code automation engine (e.g. form submissions, task completions, proposal acceptance). Configure automations in SuiteDash to fire webhooks to this endpoint with a custom event signifier."
})
  .input(
    z.object({
      eventType: z.string().describe('Custom event signifier string'),
      eventId: z.string().describe('Unique identifier for the event'),
      payload: z.record(z.string(), z.unknown()).describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Custom event signifier'),
      eventId: z.string().describe('Unique event identifier'),
      payload: z.record(z.string(), z.unknown()).describe('Full automation event data')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as Record<string, unknown>;

      let eventType = (data.event as string) ?? (data.type as string) ?? 'automation';
      let eventId = (data.uid as string) ?? (data.id as string) ?? `automation_${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `automation.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          eventType: ctx.input.eventType,
          eventId: ctx.input.eventId,
          payload: ctx.input.payload
        }
      };
    }
  })
  .build();
