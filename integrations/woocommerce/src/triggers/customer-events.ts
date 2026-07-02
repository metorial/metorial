import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let customerEvents = SlateTrigger.create(spec, {
  name: 'Customer Events',
  key: 'customer_events',
  description: 'Triggers when a customer is created, updated, or deleted in the store.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of customer event'),
      webhookId: z.number().describe('WooCommerce webhook ID'),
      customer: z.any().describe('Raw customer data from WooCommerce')
    })
  )
  .output(
    z.object({
      customerId: z.number(),
      email: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      username: z.string(),
      role: z.string(),
      ordersCount: z.number(),
      totalSpent: z.string(),
      billingEmail: z.string(),
      billingPhone: z.string(),
      billingCountry: z.string(),
      billingCity: z.string(),
      billingState: z.string(),
      shippingCountry: z.string(),
      shippingCity: z.string(),
      shippingState: z.string(),
      dateCreated: z.string(),
      dateModified: z.string()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let topics = ['customer.created', 'customer.updated', 'customer.deleted'];
      let registeredWebhooks: Array<{ webhookId: number; topic: string }> = [];

      for (let topic of topics) {
        let webhook = await client.createWebhook({
          name: `Slates - ${topic}`,
          topic,
          delivery_url: ctx.input.webhookBaseUrl,
          status: 'active'
        });
        registeredWebhooks.push({ webhookId: webhook.id, topic });
      }

      return {
        registrationDetails: { webhooks: registeredWebhooks }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhooks = ctx.input.registrationDetails?.webhooks || [];

      for (let wh of webhooks) {
        try {
          await client.deleteWebhook(wh.webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let topic = ctx.request.headers.get('x-wc-webhook-topic') || '';
      let webhookId = Number.parseInt(ctx.request.headers.get('x-wc-webhook-id') || '0', 10);

      if (!body?.id) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: topic || 'customer.updated',
            webhookId,
            customer: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let c = ctx.input.customer;

      return {
        type: ctx.input.eventType,
        id: `customer-${c.id}-${ctx.input.eventType}-${c.date_modified || Date.now()}`,
        output: {
          customerId: c.id,
          email: c.email || '',
          firstName: c.first_name || '',
          lastName: c.last_name || '',
          username: c.username || '',
          role: c.role || '',
          ordersCount: c.orders_count || 0,
          totalSpent: c.total_spent || '0',
          billingEmail: c.billing?.email || '',
          billingPhone: c.billing?.phone || '',
          billingCountry: c.billing?.country || '',
          billingCity: c.billing?.city || '',
          billingState: c.billing?.state || '',
          shippingCountry: c.shipping?.country || '',
          shippingCity: c.shipping?.city || '',
          shippingState: c.shipping?.state || '',
          dateCreated: c.date_created || '',
          dateModified: c.date_modified || ''
        }
      };
    }
  })
  .build();
