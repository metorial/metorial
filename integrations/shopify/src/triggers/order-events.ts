import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

let orderWebhookTopics = [
  'orders/create',
  'orders/updated',
  'orders/cancelled',
  'orders/fulfilled',
  'orders/paid',
  'orders/partially_fulfilled'
] as const;

export let orderEvents = SlateTrigger.create(spec, {
  name: 'Order Events',
  key: 'order_events',
  description:
    'Triggers when orders are created, updated, cancelled, fulfilled, paid, or partially fulfilled in the Shopify store.'
})
  .input(
    z.object({
      topic: z.string().describe('Webhook topic that fired'),
      orderId: z.string().describe('Shopify order ID'),
      payload: z.any().describe('Raw order payload from Shopify')
    })
  )
  .output(
    z.object({
      orderId: z.string(),
      orderNumber: z.number(),
      name: z.string(),
      email: z.string().nullable(),
      totalPrice: z.string(),
      subtotalPrice: z.string(),
      totalTax: z.string(),
      totalDiscounts: z.string(),
      currency: z.string(),
      financialStatus: z.string().nullable(),
      fulfillmentStatus: z.string().nullable(),
      cancelledAt: z.string().nullable(),
      closedAt: z.string().nullable(),
      note: z.string().nullable(),
      tags: z.string(),
      lineItems: z.array(
        z.object({
          lineItemId: z.string(),
          title: z.string(),
          quantity: z.number(),
          price: z.string(),
          sku: z.string().nullable(),
          variantId: z.string().nullable(),
          productId: z.string().nullable()
        })
      ),
      customerEmail: z.string().nullable(),
      customerId: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ShopifyClient({
        token: ctx.auth.token,
        shopDomain: ctx.config.shopDomain,
        apiVersion: ctx.config.apiVersion
      });

      let webhookIds: string[] = [];
      for (let topic of orderWebhookTopics) {
        let webhook = await client.createWebhook({
          topic,
          address: ctx.input.webhookBaseUrl
        });
        webhookIds.push(String(webhook.id));
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ShopifyClient({
        token: ctx.auth.token,
        shopDomain: ctx.config.shopDomain,
        apiVersion: ctx.config.apiVersion
      });

      let { webhookIds } = ctx.input.registrationDetails as { webhookIds: string[] };
      for (let webhookId of webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_e) {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let topic = ctx.request.headers.get('x-shopify-topic') || 'orders/updated';

      return {
        inputs: [
          {
            topic,
            orderId: String(body.id),
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let o = ctx.input.payload;
      let topicParts = ctx.input.topic.split('/');
      let eventType = topicParts[1] || 'updated';

      return {
        type: `order.${eventType}`,
        id: `${ctx.input.orderId}-${ctx.input.topic}-${o.updated_at || o.created_at}`,
        output: {
          orderId: String(o.id),
          orderNumber: o.order_number,
          name: o.name,
          email: o.email,
          totalPrice: o.total_price,
          subtotalPrice: o.subtotal_price,
          totalTax: o.total_tax,
          totalDiscounts: o.total_discounts,
          currency: o.currency,
          financialStatus: o.financial_status,
          fulfillmentStatus: o.fulfillment_status,
          cancelledAt: o.cancelled_at,
          closedAt: o.closed_at,
          note: o.note,
          tags: o.tags || '',
          lineItems: (o.line_items || []).map((li: any) => ({
            lineItemId: String(li.id),
            title: li.title,
            quantity: li.quantity,
            price: li.price,
            sku: li.sku,
            variantId: li.variant_id ? String(li.variant_id) : null,
            productId: li.product_id ? String(li.product_id) : null
          })),
          customerEmail: o.customer ? o.customer.email : o.email,
          customerId: o.customer ? String(o.customer.id) : null,
          createdAt: o.created_at,
          updatedAt: o.updated_at
        }
      };
    }
  })
  .build();
