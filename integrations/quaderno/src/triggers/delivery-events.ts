import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let ALL_DELIVERY_EVENTS = ['delivery.succeeded', 'delivery.failed', 'delivery.rejected'];

export let deliveryEvents = SlateTrigger.create(spec, {
  name: 'Delivery Events',
  key: 'delivery_events',
  description:
    'Triggered when document deliveries (e.g., e-invoices) succeed, fail, or are rejected.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      eventId: z.string().describe('Unique event identifier'),
      deliveryData: z.any().describe('Full delivery payload from webhook')
    })
  )
  .output(
    z.object({
      deliveryId: z.string().optional().describe('Delivery ID'),
      documentId: z.string().optional().describe('Associated document ID'),
      status: z.string().optional().describe('Delivery status (succeeded, failed, rejected)'),
      errorMessage: z.string().optional().describe('Error message if delivery failed')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events_types: ALL_DELIVERY_EVENTS
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
            deliveryData: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.deliveryData;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          deliveryId: data.id?.toString(),
          documentId: data.document_id?.toString(),
          status: data.status,
          errorMessage: data.error_message || data.error
        }
      };
    }
  })
  .build();
