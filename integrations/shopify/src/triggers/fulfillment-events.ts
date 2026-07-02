import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

let fulfillmentWebhookTopics = ['fulfillments/create', 'fulfillments/update'] as const;

export let fulfillmentEvents = SlateTrigger.create(spec, {
  name: 'Fulfillment Events',
  key: 'fulfillment_events',
  description:
    'Triggers when fulfillments are created or updated on orders. Useful for tracking shipment status changes.'
})
  .input(
    z.object({
      topic: z.string().describe('Webhook topic'),
      fulfillmentId: z.string().describe('Fulfillment ID'),
      payload: z.any().describe('Raw fulfillment payload')
    })
  )
  .output(
    z.object({
      fulfillmentId: z.string(),
      orderId: z.string(),
      status: z.string(),
      trackingNumber: z.string().nullable(),
      trackingUrl: z.string().nullable(),
      trackingCompany: z.string().nullable(),
      shipmentStatus: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      lineItems: z.array(
        z.object({
          lineItemId: z.string(),
          title: z.string(),
          quantity: z.number(),
          sku: z.string().nullable()
        })
      )
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
      for (let topic of fulfillmentWebhookTopics) {
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
      let topic = ctx.request.headers.get('x-shopify-topic') || 'fulfillments/update';

      return {
        inputs: [
          {
            topic,
            fulfillmentId: String(body.id),
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let f = ctx.input.payload;
      let topicParts = ctx.input.topic.split('/');
      let eventType = topicParts[1] || 'update';
      let normalizedType =
        eventType === 'create' ? 'created' : eventType === 'update' ? 'updated' : eventType;

      return {
        type: `fulfillment.${normalizedType}`,
        id: `${ctx.input.fulfillmentId}-${ctx.input.topic}-${f.updated_at || f.created_at || Date.now()}`,
        output: {
          fulfillmentId: String(f.id),
          orderId: String(f.order_id),
          status: f.status || '',
          trackingNumber: f.tracking_number || null,
          trackingUrl: f.tracking_url || null,
          trackingCompany: f.tracking_company || null,
          shipmentStatus: f.shipment_status || null,
          createdAt: f.created_at || '',
          updatedAt: f.updated_at || '',
          lineItems: (f.line_items || []).map((li: any) => ({
            lineItemId: String(li.id),
            title: li.title || '',
            quantity: li.quantity || 0,
            sku: li.sku || null
          }))
        }
      };
    }
  })
  .build();
