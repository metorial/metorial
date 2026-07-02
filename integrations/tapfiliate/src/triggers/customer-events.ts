import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let customerEvents = SlateTrigger.create(spec, {
  name: 'Customer Events',
  key: 'customer_events',
  description:
    'Triggered when a customer is created or their status changes. Configure the webhook URL in the Tapfiliate dashboard under Settings > Trigger emails & webhooks.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of customer event'),
      customerId: z.string().describe('ID of the customer'),
      customer: z.any().describe('Full customer data from the webhook payload')
    })
  )
  .output(
    z.object({
      customerId: z.string().describe('Unique customer identifier'),
      status: z
        .string()
        .optional()
        .describe('Customer status (trial, lead, new, paying, canceled)'),
      affiliateId: z.string().optional().describe('ID of the referring affiliate'),
      programId: z.string().optional().describe('ID of the associated program')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = 'customer.created';
      if (data.event === 'customer-updated' || data.event === 'customer_updated') {
        eventType = 'customer.updated';
      }
      if (data.event === 'customer-created' || data.event === 'customer_created') {
        eventType = 'customer.created';
      }

      let customer = data.customer || data;

      return {
        inputs: [
          {
            eventType,
            customerId: customer.customer_id || customer.id || data.id,
            customer
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let customer = ctx.input.customer || {};

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.customerId}-${Date.now()}`,
        output: {
          customerId: ctx.input.customerId,
          status: customer.status,
          affiliateId: customer.affiliate?.id,
          programId: customer.program?.id
        }
      };
    }
  })
  .build();
