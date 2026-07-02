import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let productEvents = SlateTrigger.create(spec, {
  name: 'Product Events',
  key: 'product_events',
  description: 'Triggers when a product (rental unit) is created or updated.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      eventType: z.string().describe('Event type: products.created or products.updated'),
      productNew: z.any().describe('New product data'),
      productOld: z.any().nullable().describe('Previous product data')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('UUID of the product'),
      organizationId: z.string().describe('UUID of the organization'),
      name: z.any().describe('Localized product name'),
      rentPeriod: z.string().describe('Billing interval: daily or nightly'),
      timezone: z.string().describe('Product timezone'),
      interaction: z.string().nullable().describe('Booking flow type'),
      currency: z.string().nullable().describe('Transaction currency'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BookingmoodClient(ctx.auth.token);
      let webhook = await client.createWebhook({
        endpoint: ctx.input.webhookBaseUrl,
        events: ['products.created', 'products.updated'],
        description: 'Slates: Product Events'
      });
      return { registrationDetails: { webhookId: webhook.id } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new BookingmoodClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      return {
        inputs: [
          {
            eventId: data.id,
            eventType: data.event_type,
            productNew: data.payload?.new ?? null,
            productOld: data.payload?.old ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let product = ctx.input.productNew;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          productId: product.id,
          organizationId: product.organization_id,
          name: product.name,
          rentPeriod: product.rent_period,
          timezone: product.timezone,
          interaction: product.interaction ?? null,
          currency: product.currency ?? null,
          createdAt: product.created_at,
          updatedAt: product.updated_at
        }
      };
    }
  })
  .build();
