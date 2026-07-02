import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let INVOICE_EVENT_TYPES = [
  'invoice.created',
  'invoice.updated',
  'invoice.published',
  'invoice.canceled',
  'invoice.deleted',
  'invoice.payment_made',
  'invoice.refunded',
  'invoice.scheduled_charge_failed'
];

export let invoiceEvents = SlateTrigger.create(spec, {
  name: 'Invoice Events',
  key: 'invoice_events',
  description:
    'Triggered on invoice lifecycle events: created, published, updated, canceled, deleted, payment made, refunded, and scheduled charge failures.'
})
  .input(
    z.object({
      eventType: z.string(),
      eventId: z.string(),
      merchantId: z.string().optional(),
      createdAt: z.string().optional(),
      rawInvoice: z.record(z.string(), z.any())
    })
  )
  .output(
    z.object({
      invoiceId: z.string().optional(),
      invoiceNumber: z.string().optional(),
      status: z.string().optional(),
      orderId: z.string().optional(),
      locationId: z.string().optional(),
      version: z.number().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      let subscription = await client.createWebhookSubscription({
        idempotencyKey: crypto.randomUUID(),
        subscription: {
          name: 'Square Invoice Events',
          eventTypes: INVOICE_EVENT_TYPES,
          notificationUrl: ctx.input.webhookBaseUrl
        }
      });
      return { registrationDetails: { subscriptionId: subscription.id } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      await client.deleteWebhookSubscription(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      if (!body?.type) return { inputs: [] };

      let invoice = body.data?.object?.invoice || body.data?.object || {};

      return {
        inputs: [
          {
            eventType: body.type,
            eventId: body.event_id || crypto.randomUUID(),
            merchantId: body.merchant_id,
            createdAt: body.created_at,
            rawInvoice: invoice
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let i = ctx.input.rawInvoice as any;
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          invoiceId: i.id,
          invoiceNumber: i.invoice_number,
          status: i.status,
          orderId: i.order_id,
          locationId: i.location_id,
          version: i.version,
          createdAt: i.created_at,
          updatedAt: i.updated_at
        }
      };
    }
  })
  .build();
