import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let orderEventTypes = ['order.created', 'order.updated', 'order.deleted'] as const;

export let orderEvents = SlateTrigger.create(spec, {
  name: 'Order Events',
  key: 'order_events',
  description: 'Triggers when an order is created, updated, or deleted in the CloudCart store.'
})
  .input(
    z.object({
      eventType: z.enum(orderEventTypes).describe('The type of order event'),
      orderId: z.string().describe('ID of the affected order'),
      orderAttributes: z
        .record(z.string(), z.any())
        .describe('Order attributes from the webhook payload')
    })
  )
  .output(
    z.object({
      orderId: z.string(),
      customerEmail: z.string().optional(),
      customerFirstName: z.string().optional(),
      customerLastName: z.string().optional(),
      status: z.string().optional(),
      statusFulfillment: z.string().optional(),
      priceTotal: z.any().optional(),
      currency: z.string().optional(),
      quantity: z.any().optional(),
      dateAdded: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });

      let webhookIds: string[] = [];
      for (let event of orderEventTypes) {
        let res = await client.createWebhook({
          url: ctx.input.webhookBaseUrl,
          event,
          new_version: 1
        });
        webhookIds.push(res.data.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_err) {
          // Webhook may already be deleted or deactivated
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;

      let data = body.data;
      if (!data) {
        return { inputs: [] };
      }

      let eventType: string = 'order.updated';
      if (body.event) {
        eventType = body.event;
      }

      let resource = Array.isArray(data) ? data[0] : data;
      if (!resource) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: eventType as (typeof orderEventTypes)[number],
            orderId: String(resource.id || ''),
            orderAttributes: (resource.attributes || resource) as Record<string, any>
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let attrs = ctx.input.orderAttributes as Record<string, any>;

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.orderId}-${Date.now()}`,
        output: {
          orderId: ctx.input.orderId,
          customerEmail: attrs.customer_email as string | undefined,
          customerFirstName: attrs.customer_first_name as string | undefined,
          customerLastName: attrs.customer_last_name as string | undefined,
          status: attrs.status as string | undefined,
          statusFulfillment: attrs.status_fulfillment as string | undefined,
          priceTotal: attrs.price_total,
          currency: attrs.currency as string | undefined,
          quantity: attrs.quantity,
          dateAdded: attrs.date_added as string | undefined,
          updatedAt: attrs.updated_at as string | undefined
        }
      };
    }
  })
  .build();
