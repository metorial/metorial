import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let orderEvents = SlateTrigger.create(spec, {
  name: 'Order Events',
  key: 'order_events',
  description:
    'Triggers when an order is created or updated on a Squarespace merchant site. Requires OAuth authentication with Orders API access.'
})
  .input(
    z.object({
      topic: z.string().describe('The webhook event topic (order.create or order.update)'),
      webhookId: z.string().describe('Unique webhook notification ID'),
      orderId: z.string().describe('The order ID from the event'),
      websiteId: z.string().optional().describe('The website ID'),
      rawPayload: z.any().describe('Complete webhook payload')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Unique order identifier'),
      orderNumber: z.string().optional().describe('Human-readable order number'),
      createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
      modifiedOn: z.string().optional().describe('ISO 8601 last modification timestamp'),
      fulfillmentStatus: z.string().optional().describe('Current fulfillment status'),
      customerEmail: z.string().optional().describe('Customer email address'),
      lineItems: z.array(z.any()).optional().describe('Items in the order'),
      grandTotal: z.any().optional().describe('Total order amount'),
      shippingAddress: z.any().optional().describe('Shipping address'),
      billingAddress: z.any().optional().describe('Billing address'),
      raw: z.any().describe('Complete raw order data')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let subscription = await client.createWebhookSubscription({
        endpointUrl: ctx.input.webhookBaseUrl,
        topics: ['order.create', 'order.update']
      });

      return {
        registrationDetails: {
          subscriptionId: subscription.id,
          secret: subscription.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { subscriptionId: string };
      await client.deleteWebhookSubscription(details.subscriptionId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let topic = body.topic || '';
      let webhookId = body.id || body.webhookId || crypto.randomUUID();
      let orderId = body.data?.orderId || body.orderId || '';
      let websiteId = body.websiteId || '';

      return {
        inputs: [
          {
            topic,
            webhookId,
            orderId,
            websiteId,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let order: any = {};
      try {
        order = await client.getOrder(ctx.input.orderId);
      } catch {
        order = ctx.input.rawPayload?.data || {};
      }

      let eventType = ctx.input.topic === 'order.create' ? 'order.created' : 'order.updated';

      return {
        type: eventType,
        id: ctx.input.webhookId,
        output: {
          orderId: order.id || ctx.input.orderId,
          orderNumber: order.orderNumber,
          createdOn: order.createdOn,
          modifiedOn: order.modifiedOn,
          fulfillmentStatus: order.fulfillmentStatus,
          customerEmail: order.customerEmail,
          lineItems: order.lineItems,
          grandTotal: order.grandTotal,
          shippingAddress: order.shippingAddress,
          billingAddress: order.billingAddress,
          raw: order
        }
      };
    }
  })
  .build();
