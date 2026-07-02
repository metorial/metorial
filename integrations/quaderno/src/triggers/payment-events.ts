import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let ALL_PAYMENT_EVENTS = ['payment.created', 'payment.deleted'];

export let paymentEvents = SlateTrigger.create(spec, {
  name: 'Payment Events',
  key: 'payment_events',
  description: 'Triggered when payments are created or deleted in Quaderno.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      eventId: z.string().describe('Unique event identifier'),
      paymentData: z.any().describe('Full payment payload from webhook')
    })
  )
  .output(
    z.object({
      paymentId: z.string().optional().describe('Payment ID'),
      documentId: z.string().optional().describe('Associated document ID'),
      amount: z.string().optional().describe('Payment amount'),
      date: z.string().optional().describe('Payment date'),
      paymentMethod: z.string().optional().describe('Payment method')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events_types: ALL_PAYMENT_EVENTS
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
            paymentData: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.paymentData;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          paymentId: data.id?.toString(),
          documentId: data.document_id?.toString(),
          amount: data.amount,
          date: data.date,
          paymentMethod: data.payment_method
        }
      };
    }
  })
  .build();
