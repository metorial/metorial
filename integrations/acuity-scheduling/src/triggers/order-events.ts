import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let orderEvents = SlateTrigger.create(spec, {
  name: 'Order Events',
  key: 'order_events',
  description: 'Triggers when a package, gift certificate, or subscription order is completed.'
})
  .input(
    z.object({
      action: z.string().describe('The event action (order.completed)'),
      orderId: z.number().describe('The order ID')
    })
  )
  .output(
    z.object({
      orderId: z.number().describe('Order ID'),
      status: z.string().optional().describe('Order status'),
      total: z.string().optional().describe('Order total'),
      title: z.string().optional().describe('Order title'),
      email: z.string().optional().describe('Customer email'),
      time: z.string().optional().describe('Order time')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        authMethod: ctx.auth.authMethod
      });

      let webhook = await client.createWebhook({
        event: 'order.completed',
        target: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: { webhookId: webhook.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        authMethod: ctx.auth.authMethod
      });

      let details = ctx.input.registrationDetails as { webhookId: number };

      try {
        await client.deleteWebhook(details.webhookId);
      } catch {
        // Webhook may already be deleted
      }
    },

    handleRequest: async ctx => {
      let body = await ctx.request.text();
      let params = new URLSearchParams(body);

      let action = params.get('action') || '';
      let id = params.get('id') || '';

      return {
        inputs: [
          {
            action,
            orderId: Number.parseInt(id, 10)
          }
        ]
      };
    },

    handleEvent: async ctx => {
      // Order details are minimal in the webhook payload
      // The order ID can be used to look up details via the orders endpoint
      return {
        type: 'order.completed',
        id: `${ctx.input.orderId}-${ctx.input.action}-${Date.now()}`,
        output: {
          orderId: ctx.input.orderId
        }
      };
    }
  })
  .build();
