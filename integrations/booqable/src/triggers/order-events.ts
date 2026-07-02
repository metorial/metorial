import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig } from '../lib/helpers';
import { spec } from '../spec';

let orderEventTypes = [
  'order.saved_as_draft',
  'order.reserved',
  'order.started',
  'order.stopped',
  'order.updated',
  'order.canceled',
  'order.archived'
] as const;

export let orderEvents = SlateTrigger.create(spec, {
  name: 'Order Events',
  key: 'order_events',
  description:
    'Triggers when an order is created, updated, reserved, started, stopped, canceled, or archived.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of order event'),
      webhookId: z.string().describe('The webhook delivery ID'),
      orderId: z.string().describe('The affected order ID'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('The order ID'),
      orderNumber: z.string().optional().describe('The order number'),
      status: z.string().optional().describe('Current order status'),
      startsAt: z.string().optional().describe('Rental start date'),
      stopsAt: z.string().optional().describe('Rental end date'),
      customerId: z.string().optional().describe('Associated customer ID'),
      grandTotalInCents: z.number().optional().describe('Grand total in cents'),
      discountPercentage: z.number().optional().describe('Discount percentage applied'),
      tags: z.array(z.string()).optional().describe('Order tags'),
      createdAt: z.string().optional().describe('Order creation timestamp'),
      updatedAt: z.string().optional().describe('Order last updated timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(buildClientConfig(ctx));

      let response = await client.createWebhookEndpoint({
        url: ctx.input.webhookBaseUrl,
        events: [...orderEventTypes],
        version: 4
      });

      let endpointId = response?.data?.id;

      return {
        registrationDetails: {
          webhookEndpointId: endpointId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(buildClientConfig(ctx));
      let endpointId = ctx.input.registrationDetails?.webhookEndpointId;
      if (endpointId) {
        await client.deleteWebhookEndpoint(endpointId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data?.event || data?.type || 'order.updated';
      let _orderData = data?.data?.attributes || data?.data || data?.order || data;
      let orderId = data?.data?.id || data?.order_id || data?.id || '';
      let webhookId = data?.webhook_id || data?.id || `${orderId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType: String(eventType),
            webhookId: String(webhookId),
            orderId: String(orderId),
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let attrs =
        ctx.input.payload?.data?.attributes ||
        ctx.input.payload?.order ||
        ctx.input.payload ||
        {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.webhookId,
        output: {
          orderId: ctx.input.orderId,
          orderNumber: attrs.number ? String(attrs.number) : undefined,
          status: attrs.status,
          startsAt: attrs.starts_at,
          stopsAt: attrs.stops_at,
          customerId: attrs.customer_id,
          grandTotalInCents: attrs.grand_total_in_cents,
          discountPercentage: attrs.discount_percentage,
          tags: attrs.tags,
          createdAt: attrs.created_at,
          updatedAt: attrs.updated_at
        }
      };
    }
  })
  .build();
