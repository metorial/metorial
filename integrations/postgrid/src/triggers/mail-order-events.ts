import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { PrintMailClient } from '../lib/client';
import { spec } from '../spec';

let ALL_EVENTS = [
  'letter.created',
  'letter.updated',
  'postcard.created',
  'postcard.updated',
  'cheque.created',
  'cheque.updated',
  'self_mailer.created',
  'self_mailer.updated',
  'return_envelope_order.created',
  'return_envelope_order.updated'
];

export let mailOrderEvents = SlateTrigger.create(spec, {
  name: 'Mail Order Events',
  key: 'mail_order_events',
  description:
    'Triggered when mail orders (letters, postcards, cheques, self-mailers, return envelope orders) are created or updated in PostGrid. Receives real-time webhook notifications for order status changes.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The event type (e.g., letter.created, postcard.updated)'),
      orderId: z.string().describe('ID of the affected mail order'),
      orderObject: z
        .string()
        .describe(
          'Object type (letter, postcard, cheque, self_mailer, return_envelope_order)'
        ),
      status: z.string().optional().nullable().describe('Current status of the order'),
      live: z.boolean().optional().nullable().describe('Whether this is a live order'),
      trackingNumber: z
        .string()
        .optional()
        .nullable()
        .describe('USPS tracking number if available'),
      url: z.string().optional().nullable().describe('URL to the rendered PDF'),
      sendDate: z.string().optional().nullable().describe('Send date'),
      createdAt: z.string().optional().nullable().describe('Creation timestamp'),
      updatedAt: z.string().optional().nullable().describe('Last update timestamp'),
      rawOrder: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full raw order object from PostGrid')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('ID of the affected mail order'),
      orderObject: z
        .string()
        .describe(
          'Object type (letter, postcard, cheque, self_mailer, return_envelope_order)'
        ),
      status: z
        .string()
        .optional()
        .nullable()
        .describe(
          'Current order status (ready, printing, processed_for_delivery, completed, cancelled)'
        ),
      live: z.boolean().optional().nullable().describe('Whether this is a live order'),
      trackingNumber: z.string().optional().nullable().describe('USPS tracking number'),
      imbStatus: z.string().optional().nullable().describe('Intelligent Mail Barcode status'),
      url: z.string().optional().nullable().describe('URL to the rendered PDF'),
      sendDate: z.string().optional().nullable().describe('Scheduled or actual send date'),
      createdAt: z.string().optional().nullable().describe('Creation timestamp'),
      updatedAt: z.string().optional().nullable().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PrintMailClient(ctx.auth.token);

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        description: 'Slates mail order events webhook',
        enabledEvents: ALL_EVENTS,
        payloadFormat: 'json'
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          secret: webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new PrintMailClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.type as string;
      let orderData = body.data || {};

      return {
        inputs: [
          {
            eventType,
            orderId: orderData.id || '',
            orderObject: orderData.object || eventType.split('.')[0],
            status: orderData.status,
            live: orderData.live,
            trackingNumber: orderData.trackingNumber,
            url: orderData.url,
            sendDate: orderData.sendDate,
            createdAt: orderData.createdAt,
            updatedAt: orderData.updatedAt,
            rawOrder: orderData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let rawOrder = (ctx.input.rawOrder || {}) as Record<string, any>;

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}_${ctx.input.orderId}_${ctx.input.updatedAt || ctx.input.createdAt || Date.now()}`,
        output: {
          orderId: ctx.input.orderId,
          orderObject: ctx.input.orderObject,
          status: ctx.input.status,
          live: ctx.input.live,
          trackingNumber:
            ctx.input.trackingNumber ??
            (rawOrder.trackingNumber as string | null | undefined) ??
            null,
          imbStatus: (rawOrder.imbStatus as string | null | undefined) ?? null,
          url: ctx.input.url,
          sendDate: ctx.input.sendDate,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
