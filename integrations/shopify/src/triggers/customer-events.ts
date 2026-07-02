import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

let customerWebhookTopics = [
  'customers/create',
  'customers/update',
  'customers/delete',
  'customers/enable',
  'customers/disable'
] as const;

export let customerEvents = SlateTrigger.create(spec, {
  name: 'Customer Events',
  key: 'customer_events',
  description:
    'Triggers when customers are created, updated, deleted, enabled, or disabled in the Shopify store.'
})
  .input(
    z.object({
      topic: z.string().describe('Webhook topic that fired'),
      customerId: z.string().describe('Shopify customer ID'),
      payload: z.any().describe('Raw customer payload from Shopify')
    })
  )
  .output(
    z.object({
      customerId: z.string(),
      email: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      phone: z.string().nullable(),
      ordersCount: z.number(),
      totalSpent: z.string(),
      state: z.string(),
      tags: z.string(),
      verifiedEmail: z.boolean(),
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
      for (let topic of customerWebhookTopics) {
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
      let topic = ctx.request.headers.get('x-shopify-topic') || 'customers/update';

      return {
        inputs: [
          {
            topic,
            customerId: String(body.id),
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let c = ctx.input.payload;
      let topicParts = ctx.input.topic.split('/');
      let eventType = topicParts[1] || 'update';
      let normalizedType =
        eventType === 'update'
          ? 'updated'
          : eventType === 'create'
            ? 'created'
            : eventType === 'delete'
              ? 'deleted'
              : eventType === 'enable'
                ? 'enabled'
                : eventType === 'disable'
                  ? 'disabled'
                  : eventType;

      return {
        type: `customer.${normalizedType}`,
        id: `${ctx.input.customerId}-${ctx.input.topic}-${c.updated_at || c.created_at || Date.now()}`,
        output: {
          customerId: String(c.id),
          email: c.email || null,
          firstName: c.first_name || null,
          lastName: c.last_name || null,
          phone: c.phone || null,
          ordersCount: c.orders_count || 0,
          totalSpent: c.total_spent || '0.00',
          state: c.state || '',
          tags: c.tags || '',
          verifiedEmail: c.verified_email || false,
          createdAt: c.created_at || '',
          updatedAt: c.updated_at || ''
        }
      };
    }
  })
  .build();
