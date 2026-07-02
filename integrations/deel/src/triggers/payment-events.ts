import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let paymentEvents = SlateTrigger.create(spec, {
  name: 'Payment Events',
  key: 'payment_events',
  description:
    'Triggered when payment events occur: payment statement initiated or marked as paid.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type identifier'),
      eventId: z.string().describe('Unique identifier for this event'),
      payload: z.any().describe('Full event payload from Deel')
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('ID of the payment'),
      status: z.string().optional().describe('Payment status'),
      amount: z.number().optional().describe('Payment amount'),
      currency: z.string().optional().describe('Payment currency'),
      rawEvent: z.any().describe('Full raw event data from Deel')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let result = await client.createWebhook({
        name: 'Slates Payment Events',
        description: 'Auto-registered webhook for payment events',
        url: ctx.input.webhookBaseUrl,
        events: ['payment.initiated', 'payment.paid']
      });

      let webhookData = result?.data ?? result;

      return {
        registrationDetails: {
          webhookId: webhookData?.id ?? webhookData?.webhook_id,
          secret: webhookData?.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let meta = data?.data?.meta ?? data?.meta ?? {};
      let trackingId = meta.tracking_id ?? data?.id ?? `payment-${Date.now()}`;
      let eventType = meta.event_type ?? data?.event_type ?? 'payment.unknown';

      return {
        inputs: [
          {
            eventType,
            eventId: trackingId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let resource = ctx.input.payload?.data?.resource ?? ctx.input.payload?.resource ?? {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          paymentId: resource?.id?.toString() ?? '',
          status: resource?.status,
          amount: resource?.amount != null ? Number(resource.amount) : undefined,
          currency: resource?.currency ?? resource?.currency_code,
          rawEvent: ctx.input.payload
        }
      };
    }
  })
  .build();
