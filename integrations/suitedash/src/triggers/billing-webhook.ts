import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let billingWebhook = SlateTrigger.create(spec, {
  name: 'Billing Webhook',
  key: 'billing_webhook',
  description:
    'Triggers on subscription lifecycle events: created, canceled, expired, or unpaid. Configure the webhook URL in SuiteDash under Integrations > Webhooks > Billing.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of subscription event'),
      subscriptionId: z.string().describe('Unique identifier for the event'),
      payload: z.record(z.string(), z.unknown()).describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      eventType: z
        .string()
        .describe('Type of subscription event (e.g. created, canceled, expired, unpaid)'),
      subscriptionId: z.string().describe('Subscription identifier'),
      payload: z.record(z.string(), z.unknown()).describe('Full subscription event data')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as Record<string, unknown>;

      let eventType = (data.event as string) ?? (data.type as string) ?? 'unknown';
      let subscriptionId =
        (data.subscription_id as string) ??
        (data.uid as string) ??
        (data.id as string) ??
        `billing_${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            subscriptionId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `subscription.${ctx.input.eventType}`,
        id: ctx.input.subscriptionId,
        output: {
          eventType: ctx.input.eventType,
          subscriptionId: ctx.input.subscriptionId,
          payload: ctx.input.payload
        }
      };
    }
  })
  .build();
