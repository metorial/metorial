import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let ALL_CHECKOUT_EVENTS = ['checkout.succeeded', 'checkout.failed', 'checkout.abandoned'];

export let checkoutEvents = SlateTrigger.create(spec, {
  name: 'Checkout Events',
  key: 'checkout_events',
  description: 'Triggered when checkout sessions succeed, fail, or are abandoned in Quaderno.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      eventId: z.string().describe('Unique event identifier'),
      checkoutData: z.any().describe('Full checkout payload from webhook')
    })
  )
  .output(
    z.object({
      sessionId: z.string().optional().describe('Checkout session ID'),
      status: z.string().optional().describe('Session status'),
      customerEmail: z.string().optional().describe('Customer email'),
      currency: z.string().optional().describe('Currency code'),
      total: z.string().optional().describe('Total amount')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events_types: ALL_CHECKOUT_EVENTS
      });

      return {
        registrationDetails: {
          webhookId: webhook.id?.toString()
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = body.event_type || body.type || '';
      let data = body.data || body;
      let eventId = `${eventType}-${data.id || ''}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            checkoutData: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.checkoutData;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          sessionId: data.id?.toString(),
          status: data.status,
          customerEmail: data.customer_email,
          currency: data.currency,
          total: data.total
        }
      };
    }
  })
  .build();
