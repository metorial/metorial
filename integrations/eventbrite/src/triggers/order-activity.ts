import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let orderActivity = SlateTrigger.create(spec, {
  name: 'Order Activity',
  key: 'order_activity',
  description:
    'Triggered when a new order is placed or an existing order is updated for events in your Eventbrite account.'
})
  .input(
    z.object({
      action: z
        .string()
        .describe('The webhook action (e.g., "order.placed", "order.updated").'),
      apiUrl: z.string().describe('The API URL to fetch the full order resource.')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('The unique order ID.'),
      eventId: z.string().optional().describe('The event the order belongs to.'),
      name: z.string().optional().describe('Name on the order.'),
      firstName: z.string().optional().describe('Buyer first name.'),
      lastName: z.string().optional().describe('Buyer last name.'),
      email: z.string().optional().describe('Buyer email.'),
      status: z.string().optional().describe('Order status.'),
      created: z.string().optional().describe('When the order was created.'),
      changed: z.string().optional().describe('When the order was last changed.'),
      costs: z
        .object({
          gross: z.string().optional(),
          tax: z.string().optional(),
          fees: z.string().optional()
        })
        .optional()
        .describe('Cost breakdown.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      if (!ctx.config.organizationId) {
        throw new Error('Organization ID is required in config to register webhooks.');
      }

      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook(ctx.config.organizationId, {
        endpoint_url: ctx.input.webhookBaseUrl,
        actions: 'order.placed,order.updated'
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            action: body.config?.action || 'order.updated',
            apiUrl: body.api_url || ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let orderId = extractOrderIdFromUrl(ctx.input.apiUrl);
      let order: any = {};

      if (orderId) {
        try {
          order = await client.getOrder(orderId);
        } catch (_e) {
          order = { id: orderId };
        }
      }

      let actionType = ctx.input.action;

      return {
        type: actionType,
        id: `${actionType}-${order.id || orderId || Date.now()}`,
        output: {
          orderId: order.id || orderId || '',
          eventId: order.event_id,
          name: order.name,
          firstName: order.first_name,
          lastName: order.last_name,
          email: order.email,
          status: order.status,
          created: order.created,
          changed: order.changed,
          costs: order.costs
            ? {
                gross: order.costs.gross?.display,
                tax: order.costs.tax?.display,
                fees: order.costs.eventbrite_fee?.display
              }
            : undefined
        }
      };
    }
  })
  .build();

let extractOrderIdFromUrl = (apiUrl: string): string | null => {
  let match = apiUrl.match(/\/orders\/(\d+)\//);
  return match?.[1] ?? null;
};
